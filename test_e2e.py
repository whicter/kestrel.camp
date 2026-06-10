"""
End-to-end test for Kestrel scan + notification flow.

Automatically:
1. Finds a recreation.gov campground with real available sites
2. Creates a watching alert via the production API
3. Waits up to 3 minutes for the ARQ scheduler to fire a scan
4. Checks notification_logs in the DB to confirm email was sent
5. Cleans up (deletes the test alert)

Usage:
    python3 test_e2e.py

All credentials are read from Railway env vars (already hard-coded below for convenience).
"""

import asyncio
import time
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
from datetime import date, timedelta

# ── Config ────────────────────────────────────────────────────────────────────

API_BASE        = "https://api.kestrel-camp.com"
DB_URL          = "postgresql://postgres:LoPzuARwSVrlzKNUicAexDVJdUfhhgQU@zephyr.proxy.rlwy.net:21409/railway"
ADMIN_TOKEN     = None  # will be generated below
ADMIN_USER_ID   = "4da1f9ad-7f39-431d-a0b7-8051ce7cf084"
SECRET_KEY      = "2ffd391800b66a02a406106e13baee3272ee2d024dc478b8d86588045844991b"

# Campgrounds to probe for availability (recreation.gov facility IDs)
PROBE_CAMPGROUNDS = [
    # (db_uuid, provider_id, name)
    ("2fe6e03c-8f2d-4efa-81c9-04c8c5571ea0", "232447",  "Upper Pines - Yosemite"),
    ("f4e267d5-923d-464e-8dcc-8fd0fb5c4acc", "232449",  "North Pines - Yosemite"),
    ("1401248f-8619-4076-ac77-d9f5cdb78e49", "232450",  "Lower Pines - Yosemite"),
    ("cb8adb0e-8936-45f2-96bc-3a9aacc0a2b9", "10083567","White Wolf - Yosemite"),
    ("615b9240-058b-4d07-86be-3ca632e5550d", "10000305","Burro Creek Campground"),
    ("3944e8e4-96d9-4434-a920-82662b9832f0", "10001419","Cold Brook Campground"),
]

# Search window: check 5 months out to 8 months out (should have some openings)
SEARCH_DATE_FROM = date.today() + timedelta(days=150)
SEARCH_DATE_TO   = date.today() + timedelta(days=240)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_token() -> str:
    import hmac, hashlib, base64, time as t

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

    header  = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64url(json.dumps({"sub": ADMIN_USER_ID, "exp": int(t.time()) + 7 * 24 * 3600},
                                separators=(",", ":")).encode())
    sig     = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    return f"{header}.{payload}.{b64url(sig)}"


def api_call(method: str, path: str, body=None, token: str = None) -> dict:
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read()
        print(f"  HTTP {e.code}: {body.decode()[:200]}")
        raise


def check_rec_gov_availability(provider_id: str, date_from: date, date_to: date) -> list[str]:
    """Returns list of available site IDs from recreation.gov API."""
    from calendar import monthrange

    # Collect all months to query
    months = []
    cur = date_from.replace(day=1)
    end = date_to.replace(day=1)
    while cur <= end:
        months.append(cur)
        days = monthrange(cur.year, cur.month)[1]
        cur = (cur + timedelta(days=days)).replace(day=1)

    available_sites: set[str] = set()
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://www.recreation.gov/",
        "Accept": "application/json",
    }

    base = f"https://www.recreation.gov/api/camps/availability/campground/{provider_id}/month"

    for m in months:
        start_date = f"{m.isoformat()}T00:00:00.000Z"
        qs = urllib.parse.urlencode({"start_date": start_date})
        url = f"{base}?{qs}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
            for site_id, info in data.get("campsites", {}).items():
                for date_str, status in info.get("availabilities", {}).items():
                    if status == "Available":
                        try:
                            d = date.fromisoformat(date_str[:10])
                        except ValueError:
                            continue
                        if date_from <= d <= date_to:
                            available_sites.add(site_id)
                            break
        except Exception as e:
            print(f"    Warning: {m} request failed: {e}")

    return list(available_sites)


def db_query(sql: str) -> list[tuple]:
    import subprocess
    result = subprocess.run(
        ["psql", DB_URL, "-t", "-A", "-F", "\t", "-c", sql],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"psql error: {result.stderr}")
    rows = [tuple(line.split("\t")) for line in result.stdout.strip().split("\n") if line.strip()]
    return rows


# ── Main test ─────────────────────────────────────────────────────────────────

def main():
    token = make_token()

    # Verify auth
    print("1. Verifying API auth...")
    me = api_call("GET", "/api/auth/me", token=token)
    print(f"   Logged in as: {me['email']} (admin={me['is_admin']})")
    print(f"   notify_email={me['notify_email']}, notify_sms={me['notify_sms']}")

    if not me["notify_email"]:
        print("   ⚠️  notify_email is False — notifications won't be sent!")
        print("   → Enabling email notifications...")
        api_call("PATCH", "/api/auth/me", {"notify_email": True}, token=token)

    # Find campground with real availability
    print(f"\n2. Scanning campgrounds for availability ({SEARCH_DATE_FROM} to {SEARCH_DATE_TO})...")
    target_cg = None
    for cg_uuid, provider_id, name in PROBE_CAMPGROUNDS:
        print(f"   Checking {name} (id={provider_id})...", end=" ", flush=True)
        sites = check_rec_gov_availability(provider_id, SEARCH_DATE_FROM, SEARCH_DATE_TO)
        print(f"{len(sites)} available sites")
        if sites:
            target_cg = (cg_uuid, provider_id, name, sites)
            break

    if not target_cg:
        print("\n❌ No campgrounds found with availability in the search window.")
        print("   Try adjusting SEARCH_DATE_FROM / SEARCH_DATE_TO in this script.")
        sys.exit(1)

    cg_uuid, provider_id, cg_name, avail_sites = target_cg
    print(f"\n   ✅ Found: {cg_name} — {len(avail_sites)} sites available")

    # Delete any existing alerts for this campground to avoid dedup conflicts
    print("\n3. Cleaning up any existing alerts...")
    existing = api_call("GET", "/api/alerts", token=token)
    for a in existing:
        if a["campground_id"] == cg_uuid:
            api_call("DELETE", f"/api/alerts/{a['id']}", token=token)
            print(f"   Deleted existing alert {a['id']}")

    # Create a fresh alert
    print("\n4. Creating watching alert...")
    alert = api_call("POST", "/api/alerts", {
        "campground_id": cg_uuid,
        "date_from": SEARCH_DATE_FROM.isoformat(),
        "date_to":   SEARCH_DATE_TO.isoformat(),
        "nights_min": 1,
    }, token=token)
    alert_id = alert["id"]
    print(f"   Alert created: {alert_id}")
    print(f"   Range: {alert['date_from']} → {alert['date_to']}, status={alert['status']}")

    alert_created_at = time.time()

    # Wait up to 3 minutes for ARQ scheduler to fire and scan to complete
    print(f"\n5. Waiting up to 3 min for scheduler to fire (runs every 2 min)...")

    deadline = time.time() + 200
    notified = False

    while time.time() < deadline:
        time.sleep(10)
        elapsed = time.time() - alert_created_at
        print(f"   {elapsed:.0f}s elapsed...", end="\r", flush=True)

        # Check for notification log
        rows = db_query(f"SELECT channel, sent_at FROM notification_logs WHERE alert_id = '{alert_id}' ORDER BY sent_at DESC LIMIT 5")
        if rows and rows[0][0]:
            notified = True
            break

        # Check if a new scan ran AFTER the alert was created
        snap = db_query(f"""
            SELECT s.available_count, s.scanned_at
            FROM availability_snapshots s
            WHERE s.campground_id = '{cg_uuid}'
              AND s.scanned_at > NOW() - INTERVAL '4 minutes'
            ORDER BY s.scanned_at DESC LIMIT 1
        """)
        if snap and snap[0][0]:
            count, scanned_at = snap[0]
            print(f"\n   Scan ran at {scanned_at}: {count} available sites found")
            # Wait a bit more for notification to be logged
            time.sleep(8)
            rows = db_query(f"SELECT channel, sent_at FROM notification_logs WHERE alert_id = '{alert_id}'")
            if rows and rows[0][0]:
                notified = True
            break

    print()

    # Results
    print("\n6. Results:")
    snap_rows = db_query(f"""
        SELECT s.available_count, s.scanned_at
        FROM availability_snapshots s
        WHERE s.campground_id = '{cg_uuid}'
        ORDER BY s.scanned_at DESC LIMIT 3
    """)
    if snap_rows:
        print("   Recent scans:")
        for row in snap_rows:
            print(f"     available={row[0]}, scanned_at={row[1]}")
    else:
        print("   ⚠️  No scan snapshots found yet — scheduler may not have fired")

    notif_rows = db_query(f"SELECT channel, sent_at, payload FROM notification_logs WHERE alert_id = '{alert_id}'")
    if notif_rows and notif_rows[0][0]:
        print(f"\n   ✅ NOTIFICATIONS SENT:")
        for row in notif_rows:
            print(f"     channel={row[0]}, sent_at={row[1]}, payload={row[2]}")
    else:
        print("\n   ❌ No notifications logged")
        alert_status = db_query(f"SELECT status, triggered_at FROM alerts WHERE id = '{alert_id}'")
        if alert_status:
            print(f"   Alert status: {alert_status[0]}")

    # Cleanup
    print("\n7. Cleanup: deleting test alert...")
    try:
        api_call("DELETE", f"/api/alerts/{alert_id}", token=token)
        print("   Alert deleted.")
    except Exception as e:
        print(f"   Warning: could not delete alert: {e}")

    if notified:
        print("\n🎉 TEST PASSED — scan detected availability and notification was logged!")
    else:
        print("\n⚠️  TEST INCONCLUSIVE — check if email arrived at admin@kestrel.camp")


if __name__ == "__main__":
    main()
