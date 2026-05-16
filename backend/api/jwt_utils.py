"""JWT access tokens for employees (admin UI)."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

ALG = "HS256"


def _secret() -> str:
    return getattr(settings, "JWT_SIGNING_KEY", None) or settings.SECRET_KEY


def create_access_token(employee_id: int, role: str, name: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(
        hours=int(os.environ.get("JWT_EXPIRY_HOURS", "12"))
    )
    payload = {
        "sub": str(employee_id),
        "role": role,
        "name": name,
        "exp": exp,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _secret(), algorithm=ALG)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, _secret(), algorithms=[ALG])
    except jwt.PyJWTError:
        return None
