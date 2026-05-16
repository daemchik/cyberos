"""Employee login."""
from __future__ import annotations

from django.contrib.auth.hashers import check_password
from django.db import connection
from django.views.decorators.csrf import csrf_exempt

from api.jwt_utils import create_access_token
from api.sql_views import dictfetchone, json_response, parse_json


@csrf_exempt
def auth_login(request):
    if request.method != "POST":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request)
    if not body:
        return json_response({"error": "Invalid JSON"}, 400)
    login = (body.get("login") or "").strip()
    password = body.get("password") or ""
    if not login or not password:
        return json_response({"error": "Укажите логин и пароль"}, 400)
    with connection.cursor() as c:
        c.execute(
            "SELECT id, name, login, password_hash, role FROM employees WHERE login = %s AND is_active = 1",
            [login],
        )
        row = dictfetchone(c)
    if not row:
        return json_response({"error": "Неверный логин или пароль"}, 401)
    if not check_password(password, row["password_hash"]):
        return json_response({"error": "Неверный логин или пароль"}, 401)
    token = create_access_token(
        int(row["id"]),
        str(row["role"] or "operator"),
        str(row["name"] or ""),
        str(row["login"] or ""),
    )
    return json_response(
        {
            "access_token": token,
            "token_type": "Bearer",
            "employee": {
                "id": row["id"],
                "name": row["name"],
                "login": row["login"],
                "role": row["role"],
            },
        }
    )


@csrf_exempt
def auth_me(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    eid = getattr(request, "employee_id", None)
    if eid is None:
        return json_response({"error": "Unauthorized"}, 401)
    with connection.cursor() as c:
        c.execute(
            "SELECT id, name, login, role FROM employees WHERE id = %s", [eid]
        )
        row = dictfetchone(c)
    if not row:
        return json_response({"error": "Not found"}, 404)
    return json_response(
        {
            "id": row["id"],
            "name": row["name"],
            "login": row["login"],
            "role": row["role"],
        }
    )
