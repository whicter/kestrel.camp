from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..deps import current_user
from ..models.user import User
from ..schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, UpdateSettingsRequest
from ..services.auth import (
    create_user, get_user_by_email, verify_password, create_access_token
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = await create_user(db, body.email, body.password)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
async def update_settings(
    body: UpdateSettingsRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.notify_email is not None:
        user.notify_email = body.notify_email
    if body.notify_sms is not None:
        user.notify_sms = body.notify_sms
    if body.phone is not None:
        # Normalize: store empty string as None
        user.phone = body.phone.strip() or None
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
