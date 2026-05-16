"""JWT authentication for /api/* (kiosk routes are allowlisted; agent uses shared secret)."""
from __future__ import annotations

import os
import re

from django.http import JsonResponse

from api.jwt_utils import decode_access_token

# (method, compiled regex) — полный request.path
_PUBLIC: list[tuple[str, re.Pattern[str]]] = [
    ("GET", re.compile(r"^/api/health$")),
    ("POST", re.compile(r"^/api/auth/login$")),
    ("POST", re.compile(r"^/api/player/login$")),
    ("POST", re.compile(r"^/api/player/register$")),
    ("POST", re.compile(r"^/api/promos/apply$")),
    ("POST", re.compile(r"^/api/clients/search$")),
    ("GET", re.compile(r"^/api/clients/\d+$")),
    ("PUT", re.compile(r"^/api/clients/\d+$")),
    ("GET", re.compile(r"^/api/tariffs$")),
    ("GET", re.compile(r"^/api/products$")),
    ("POST", re.compile(r"^/api/sessions$")),
    ("PUT", re.compile(r"^/api/sessions/\d+/(end|pause|resume|extend)$")),
    ("POST", re.compile(r"^/api/orders$")),
]


def _is_public(method: str, path: str) -> bool:
    m = method.upper()
    for pm, rx in _PUBLIC:
        if pm == m and rx.match(path):
            return True
    return False


def _agent_authorized(request) -> bool:
    path = request.path or ""
    if not path.startswith("/api/agent/"):
        return False
    secret = os.environ.get("AGENT_SHARED_SECRET", "dev-agent-secret")
    t = request.headers.get("X-Agent-Token") or request.GET.get("token") or ""
    return bool(secret) and t == secret


class JwtAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path or ""
        if not path.startswith("/api/"):
            return self.get_response(request)

        if request.method == "OPTIONS":
            return self.get_response(request)

        if _agent_authorized(request):
            return self.get_response(request)

        if _is_public(request.method, path):
            return self.get_response(request)

        auth = request.headers.get("Authorization") or ""
        if not auth.startswith("Bearer "):
            return JsonResponse({"error": "Требуется авторизация"}, status=401)
        token = auth[7:].strip()
        payload = decode_access_token(token)
        if not payload:
            return JsonResponse({"error": "Недействительный токен"}, status=401)
        request.employee_id = int(payload["sub"])
        request.employee_role = payload.get("role") or "operator"
        request.employee_name = payload.get("name") or ""
        return self.get_response(request)
