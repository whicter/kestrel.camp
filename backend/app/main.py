from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, campgrounds, alerts, debug, admin

app = FastAPI(
    title="Kestrel API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(campgrounds.router)
app.include_router(alerts.router)
app.include_router(debug.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
