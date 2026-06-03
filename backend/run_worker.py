"""
Wrapper to run the ARQ worker on Python 3.12+ / 3.14 where
asyncio.get_event_loop() no longer auto-creates a loop.
"""
import asyncio
import sys

# Create and set an event loop before ARQ tries to grab one
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

from arq.worker import run_worker
from app.workers.main import WorkerSettings

run_worker(WorkerSettings)
