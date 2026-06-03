"""
Run: python seed.py
Seeds the DB with sample campgrounds for local development.
"""
import asyncio
import uuid
from app.database import AsyncSessionLocal
from app.models.campground import Campground, Provider

CAMPGROUNDS = [
    dict(name="Upper Pines Campground", park_name="Yosemite National Park",
         state_province="CA", country="US", provider=Provider.recreation_gov,
         provider_id="232447", lat=37.7390, lng=-119.5590, total_sites=238,
         timezone="America/Los_Angeles"),
    dict(name="Mather Campground", park_name="Grand Canyon National Park",
         state_province="AZ", country="US", provider=Provider.recreation_gov,
         provider_id="10083480", lat=36.0573, lng=-112.1401, total_sites=327,
         timezone="America/Phoenix"),
    dict(name="Mazama Campground", park_name="Crater Lake National Park",
         state_province="OR", country="US", provider=Provider.recreation_gov,
         provider_id="234825", lat=42.8684, lng=-122.1685, total_sites=214,
         timezone="America/Los_Angeles"),
    dict(name="Pfeiffer Big Sur", park_name="Pfeiffer Big Sur State Park",
         state_province="CA", country="US", provider=Provider.reserve_california,
         provider_id="690", lat=36.2498, lng=-121.7820, total_sites=151,
         timezone="America/Los_Angeles"),
    dict(name="Environmental Campsites", park_name="Julia Pfeiffer Burns SP",
         state_province="CA", country="US", provider=Provider.reserve_california,
         provider_id="661", lat=36.1591, lng=-121.6705, total_sites=2,
         timezone="America/Los_Angeles"),
    dict(name="Rubble Creek", park_name="Garibaldi Provincial Park",
         state_province="BC", country="CA", provider=Provider.bc_parks,
         provider_id="garibaldi-rubble", lat=49.8780, lng=-122.9730, total_sites=64,
         timezone="America/Vancouver"),
    dict(name="Canisbay Lake", park_name="Algonquin Provincial Park",
         state_province="ON", country="CA", provider=Provider.going_to_camp,
         provider_id="algonquin-canisbay", lat=45.5700, lng=-78.3400, total_sites=97,
         timezone="America/Toronto"),
    dict(name="Samuel P. Taylor", park_name="Samuel P. Taylor SP",
         state_province="CA", country="US", provider=Provider.reserve_california,
         provider_id="705", lat=38.0110, lng=-122.7310, total_sites=60,
         timezone="America/Los_Angeles"),
]


async def seed():
    async with AsyncSessionLocal() as db:
        for data in CAMPGROUNDS:
            cg = Campground(id=uuid.uuid4(), **data)
            db.add(cg)
        await db.commit()
        print(f"Seeded {len(CAMPGROUNDS)} campgrounds.")


if __name__ == "__main__":
    asyncio.run(seed())
