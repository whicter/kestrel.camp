"""
Bulk import Recreation.gov campgrounds from the RIDB public data export.

No API key required. Downloads the official bulk CSV export directly from:
  https://ridb.recreation.gov/download

Usage:
  cd backend
  python import_recreation_gov.py

Downloads ~244MB ZIP containing multiple CSVs. Joins Facilities + FacilityAddresses
+ RecAreas to get state, coordinates, and park name. Imports reservable US campgrounds.
Safe to re-run — upserts by provider_id.
"""
import asyncio
import csv
import io
import logging
import uuid
import zipfile

import httpx

from app.database import AsyncSessionLocal
from app.models.campground import Campground, Provider
from sqlalchemy import select

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BULK_CSV_URL = "https://ridb.recreation.gov/downloads/RIDBFullExport_V1_CSV.zip"

US_STATES = {
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
    "VA","WA","WV","WI","WY","DC",
}

TIMEZONE_MAP = {
    "AL":"America/Chicago","AK":"America/Anchorage","AZ":"America/Phoenix",
    "AR":"America/Chicago","CA":"America/Los_Angeles","CO":"America/Denver",
    "CT":"America/New_York","DE":"America/New_York","FL":"America/New_York",
    "GA":"America/New_York","HI":"Pacific/Honolulu","ID":"America/Denver",
    "IL":"America/Chicago","IN":"America/Indiana/Indianapolis","IA":"America/Chicago",
    "KS":"America/Chicago","KY":"America/New_York","LA":"America/Chicago",
    "ME":"America/New_York","MD":"America/New_York","MA":"America/New_York",
    "MI":"America/Detroit","MN":"America/Chicago","MS":"America/Chicago",
    "MO":"America/Chicago","MT":"America/Denver","NE":"America/Chicago",
    "NV":"America/Los_Angeles","NH":"America/New_York","NJ":"America/New_York",
    "NM":"America/Denver","NY":"America/New_York","NC":"America/New_York",
    "ND":"America/Chicago","OH":"America/New_York","OK":"America/Chicago",
    "OR":"America/Los_Angeles","PA":"America/New_York","RI":"America/New_York",
    "SC":"America/New_York","SD":"America/Chicago","TN":"America/Chicago",
    "TX":"America/Chicago","UT":"America/Denver","VT":"America/New_York",
    "VA":"America/New_York","WA":"America/Los_Angeles","WV":"America/New_York",
    "WI":"America/Chicago","WY":"America/Denver","DC":"America/New_York",
}


def read_csv(zf: zipfile.ZipFile, keyword: str) -> list[dict]:
    """Find and read a CSV from the ZIP whose name contains keyword."""
    name = next((n for n in zf.namelist() if keyword.lower() in n.lower() and n.endswith(".csv")), None)
    if not name:
        logger.warning("No CSV matching '%s' found in ZIP", keyword)
        return []
    with zf.open(name) as f:
        rows = list(csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig")))
    logger.info("  %s → %d rows", name, len(rows))
    return rows


async def download_and_parse() -> list[dict]:
    logger.info("Downloading RIDB bulk CSV export (~244MB) — no API key needed")
    logger.info("  %s", BULK_CSV_URL)

    async with httpx.AsyncClient(follow_redirects=True, timeout=600) as client:
        resp = await client.get(BULK_CSV_URL)
        resp.raise_for_status()
        raw = resp.content

    logger.info("Download complete (%d MB) — parsing CSVs...", len(raw) // 1_000_000)

    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        logger.info("ZIP contents: %s", zf.namelist())

        facility_rows   = read_csv(zf, "Facilities_API")
        address_rows    = read_csv(zf, "FacilityAddresses")
        recarea_rows    = read_csv(zf, "RecAreas_API")

    # Build lookup: FacilityID → (state, country)
    addr_by_facility: dict[str, tuple[str, str]] = {}
    for a in address_rows:
        fid = a.get("FacilityID", "").strip()
        state   = a.get("AddressStateCode", "").strip().upper()
        country = a.get("AddressCountryCode", "US").strip().upper() or "US"
        if fid and state:
            addr_by_facility[fid] = (state, country)

    # Build lookup: RecAreaID → RecAreaName
    recarea_name: dict[str, str] = {}
    for r in recarea_rows:
        rid  = r.get("RecAreaID", "").strip()
        name = r.get("RecAreaName", "").strip()
        if rid and name:
            recarea_name[rid] = name

    logger.info("Address lookup: %d entries, RecArea lookup: %d entries",
                len(addr_by_facility), len(recarea_name))

    parsed = []
    skipped_not_reservable = skipped_coords = skipped_state = skipped_type = 0

    for row in facility_rows:
        if row.get("Reservable", "").strip().lower() != "true":
            skipped_not_reservable += 1
            continue

        ftype = row.get("FacilityTypeDescription", "").lower()
        if ftype and "camp" not in ftype:
            skipped_type += 1
            continue

        try:
            lat = float(row.get("FacilityLatitude", "") or 0)
            lng = float(row.get("FacilityLongitude", "") or 0)
        except ValueError:
            skipped_coords += 1
            continue
        if lat == 0.0 and lng == 0.0:
            skipped_coords += 1
            continue

        provider_id = row.get("FacilityID", "").strip()
        state, country = addr_by_facility.get(provider_id, ("", "US"))
        if not state or state not in US_STATES or country != "US":
            skipped_state += 1
            continue

        name = row.get("FacilityName", "").strip().title()
        if not name or not provider_id:
            continue

        # Park name: try RecArea name, fall back to facility name
        parent_recarea_id = row.get("ParentRecAreaID", "").strip()
        park_name = recarea_name.get(parent_recarea_id, name)

        try:
            ts = row.get("NumberOfSitesReservable", "").strip()
            total_sites = int(ts) if ts else None
        except ValueError:
            total_sites = None

        parsed.append(dict(
            name=name,
            park_name=park_name,
            state_province=state,
            country="US",
            provider=Provider.recreation_gov,
            provider_id=provider_id,
            lat=lat,
            lng=lng,
            total_sites=total_sites,
            timezone=TIMEZONE_MAP.get(state, "America/Los_Angeles"),
        ))

    logger.info(
        "%d campgrounds ready | skipped: %d not-reservable, %d no-coords, %d wrong-state/country, %d wrong-type",
        len(parsed), skipped_not_reservable, skipped_coords, skipped_state, skipped_type,
    )
    return parsed


async def import_campgrounds():
    parsed = await download_and_parse()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Campground.provider_id).where(Campground.provider == Provider.recreation_gov)
        )
        existing_ids = {row[0] for row in result.all()}
        logger.info("%d already in DB", len(existing_ids))

        new_count = update_count = 0
        for data in parsed:
            pid = data["provider_id"]
            if pid in existing_ids:
                r2 = await db.execute(
                    select(Campground).where(
                        Campground.provider == Provider.recreation_gov,
                        Campground.provider_id == pid,
                    )
                )
                cg = r2.scalar_one_or_none()
                if cg:
                    for k, v in data.items():
                        setattr(cg, k, v)
                    db.add(cg)
                    update_count += 1
            else:
                db.add(Campground(id=uuid.uuid4(), **data))
                existing_ids.add(pid)
                new_count += 1

            if (new_count + update_count) % 500 == 0:
                await db.commit()
                logger.info("  %d new, %d updated so far...", new_count, update_count)

        await db.commit()
        logger.info("Done: %d new + %d updated = %d total rec.gov campgrounds",
                    new_count, update_count, new_count + update_count)


if __name__ == "__main__":
    asyncio.run(import_campgrounds())
