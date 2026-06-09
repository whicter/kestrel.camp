import uuid
from pydantic import BaseModel, EmailStr, field_serializer


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    tier: str
    is_admin: bool
    notify_email: bool
    notify_sms: bool
    phone: str | None = None

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, v: uuid.UUID) -> str:
        return str(v)


class UpdateSettingsRequest(BaseModel):
    notify_email: bool | None = None
    notify_sms: bool | None = None
    phone: str | None = None
