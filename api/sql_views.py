"""REST API compatible with the former Express backend (React client)."""
from __future__ import annotations

import json
from datetime import date, datetime, timezone
from decimal import Decimal

from django.contrib.auth.hashers import check_password, make_password
from django.db import connection, transaction
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from api.optional_schema import ensure_club_notifications_table, ensure_optional_club_schema


def _json_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def json_response(data, status=200):
    return HttpResponse(
        json.dumps(data, default=_json_default, ensure_ascii=False),
        status=status,
        content_type="application/json; charset=utf-8",
    )


def _deactivate_expired_promos(cursor) -> None:
    try:
        cursor.execute(
            """
            UPDATE promo_codes
            SET is_active = 0
            WHERE is_active = 1
              AND expires_at IS NOT NULL
              AND expires_at <= NOW()
            """
        )
    except Exception:
        pass


def insert_club_notification(cursor, kind: str, title: str, detail: str, ref_id=None) -> None:
    ensure_club_notifications_table(cursor)
    try:
        cursor.execute(
            """
            INSERT INTO club_notifications (kind, title, detail, ref_id)
            VALUES (%s, %s, %s, %s)
            """,
            [str(kind)[:32], str(title)[:200], str(detail or "")[:2000], ref_id],
        )
    except Exception:
        pass


@csrf_exempt
def notifications_feed(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    try:
        with connection.cursor() as c:
            ensure_club_notifications_table(c)
            c.execute(
                """
                SELECT id, kind, ref_id, title, detail, created_at, read_at
                FROM club_notifications
                ORDER BY id DESC
                LIMIT 150
                """
            )
            return json_response(dictfetchall(c))
    except Exception as e:
        return json_response({"error": str(e)}, 500)


@csrf_exempt
def notifications_mark_read(request):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request) or {}
    ids = body.get("ids")
    try:
        with connection.cursor() as c:
            ensure_club_notifications_table(c)
            if ids and isinstance(ids, list) and len(ids) > 0:
                cleaned = []
                for x in ids[:200]:
                    try:
                        cleaned.append(int(x))
                    except (TypeError, ValueError):
                        continue
                if not cleaned:
                    return json_response({"ok": True})
                ph = ",".join(["%s"] * len(cleaned))
                c.execute(
                    f"UPDATE club_notifications SET read_at = NOW() "
                    f"WHERE id IN ({ph}) AND read_at IS NULL",
                    cleaned,
                )
            else:
                c.execute(
                    "UPDATE club_notifications SET read_at = NOW() WHERE read_at IS NULL"
                )
        return json_response({"ok": True})
    except Exception as e:
        return json_response({"error": str(e)}, 500)


def parse_json(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None


def _plain_str(v):
    if v is None:
        return ""
    return str(v).strip()


def _player_password_from_body(body):
    """Пароль клиента из JSON: `player_password` / `password`, либо устаревшие `player_pin` / `pin`."""
    if not body:
        return ""
    for key in ("player_password", "password"):
        s = _plain_str(body.get(key))
        if s:
            return s
    for key in ("player_pin", "pin"):
        s = _plain_str(body.get(key))
        if s:
            return s
    return ""


def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def dictfetchone(cursor):
    rows = dictfetchall(cursor)
    return rows[0] if rows else None


def _insert_transaction(
    cursor, client_id, amount, typ, method, description, employee_id=None
):
    cursor.execute(
        """
        INSERT INTO transactions
        (client_id, amount, type, method, description, employee_id)
        VALUES (%s,%s,%s,%s,%s,%s)
        """,
        [client_id, amount, typ, method, description or "", employee_id],
    )


@csrf_exempt
def player_login(request):
    """Вход игрока: телефон + пароль (публичный эндпоинт)."""
    if request.method != "POST":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request)
    if body is None:
        return json_response({"error": "Invalid JSON"}, 400)
    phone = (body.get("phone") or "").strip()
    password = _player_password_from_body(body)
    if not phone or not password:
        return json_response({"error": "Укажите телефон и пароль"}, 400)
    with connection.cursor() as c:
        ensure_optional_club_schema(c)
        c.execute(
            """
            SELECT id, name, phone, balance, total_sessions, player_pin_hash
            FROM clients WHERE phone = %s
            """,
            [phone],
        )
        row = dictfetchone(c)
    if not row or not row.get("player_pin_hash"):
        return json_response(
            {"error": "Неверный телефон или пароль не установлен. Обратитесь к администратору."},
            401,
        )
    if not check_password(password, row["player_pin_hash"]):
        return json_response({"error": "Неверный пароль"}, 401)
    return json_response(
        {
            "id": row["id"],
            "name": row["name"],
            "phone": row["phone"],
            "balance": float(row["balance"]),
            "total_sessions": int(row["total_sessions"] or 0),
        }
    )


@csrf_exempt
def player_register(request):
    """Регистрация игрока с киоска /player (публичный эндпоинт)."""
    if request.method != "POST":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request)
    if body is None:
        return json_response({"error": "Invalid JSON"}, 400)
    name = (body.get("name") or "").strip()
    phone = (body.get("phone") or "").strip()
    password = _player_password_from_body(body)
    if not name or not phone:
        return json_response({"error": "Укажите имя и телефон"}, 400)
    if not password or len(password) < 4:
        return json_response({"error": "Пароль не короче 4 символов"}, 400)
    with connection.cursor() as c:
        ensure_optional_club_schema(c)
        c.execute("SELECT id FROM clients WHERE phone = %s LIMIT 1", [phone])
        if dictfetchone(c):
            return json_response({"error": "Этот телефон уже зарегистрирован"}, 400)
        c.execute(
            """
            INSERT INTO clients (name, phone, player_pin_hash)
            VALUES (%s, %s, %s)
            """,
            [name, phone, make_password(password)],
        )
        cid = c.lastrowid
    return json_response({"id": cid, "name": name, "phone": phone, "balance": 0})


# --- health ---


@csrf_exempt
def health(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    return json_response({"status": "ok", "service": "cyberos-api"})


@csrf_exempt
def system_diagnostics(request):
    """Проверка связи с БД и базовые счётчики (кнопка «Диагностика» в админке)."""
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
            if c.fetchone() is None:
                return json_response({"database": "error"}, 503)
            c.execute("SELECT COUNT(*) AS n FROM workstations")
            ws = int(dictfetchone(c)["n"])
            c.execute(
                "SELECT COUNT(*) AS n FROM sessions WHERE status IN ('active','paused')"
            )
            sess = int(dictfetchone(c)["n"])
            mysql_version = ""
            try:
                c.execute("SELECT VERSION() AS v")
                ver_row = dictfetchone(c)
                mysql_version = str(ver_row["v"]) if ver_row else ""
            except Exception:
                pass
        return json_response(
            {
                "database": "connected",
                "workstations": ws,
                "active_sessions": sess,
                "mysql_version": mysql_version,
                "server_time_utc": datetime.now(timezone.utc).isoformat(),
            }
        )
    except Exception as e:
        return json_response({"database": "error", "error": str(e)}, 503)


# --- zones ---


@csrf_exempt
def zones(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute("SELECT * FROM zones ORDER BY id")
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        name = body.get("name")
        color = body.get("color") or "#00FF00"
        if not name:
            return json_response({"error": "name required"}, 400)
        with connection.cursor() as c:
            c.execute(
                "INSERT INTO zones (name, color) VALUES (%s, %s)", [name, color]
            )
            return json_response({"id": c.lastrowid, "name": name, "color": color})
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def zone_detail(request, pk):
    if request.method != "DELETE":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(
            "SELECT COUNT(*) AS cnt FROM workstations WHERE zone_id = %s", [pk]
        )
        row = dictfetchone(c)
        if row and row["cnt"] > 0:
            return json_response({"error": "Зона содержит ПК"}, 400)
        c.execute("DELETE FROM zones WHERE id = %s", [pk])
    return json_response({"ok": True})


# --- workstations ---


@csrf_exempt
def workstations_by_zone(request, zone_id):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(
            """
            SELECT w.*, z.name AS zone_name FROM workstations w
            JOIN zones z ON w.zone_id = z.id WHERE w.zone_id = %s
            ORDER BY w.grid_position
            """,
            [zone_id],
        )
        return json_response(dictfetchall(c))


@csrf_exempt
def workstations(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute(
                """
                SELECT w.*, z.name AS zone_name, z.color AS zone_color
                FROM workstations w JOIN zones z ON w.zone_id = z.id
                ORDER BY w.pc_number
                """
            )
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        pc_number = body.get("pc_number")
        zone_id = body.get("zone_id")
        ip_address = body.get("ip_address")
        cpu = body.get("cpu") or ""
        gpu = body.get("gpu") or ""
        ram = body.get("ram") or ""
        grid_position = body.get("grid_position") or 0
        if pc_number is None or zone_id is None or ip_address is None:
            return json_response({"error": "Missing fields"}, 400)
        with connection.cursor() as c:
            c.execute(
                """
                INSERT INTO workstations
                (pc_number, zone_id, ip_address, cpu, gpu, ram, grid_position)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                [pc_number, zone_id, ip_address, cpu, gpu, ram, grid_position],
            )
            return json_response({"id": c.lastrowid})
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def workstation_detail(request, pk):
    if request.method == "PUT":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        fields = []
        values = []
        mapping = [
            ("status", "status"),
            ("ip_address", "ip_address"),
            ("grid_position", "grid_position"),
            ("pc_number", "pc_number"),
            ("cpu", "cpu"),
            ("gpu", "gpu"),
            ("ram", "ram"),
        ]
        for key, col in mapping:
            if key in body:
                fields.append(f"{col} = %s")
                values.append(body[key])
        if not fields:
            return json_response({"error": "No fields"}, 400)
        values.append(pk)
        sql = f"UPDATE workstations SET {', '.join(fields)} WHERE id = %s"
        new_status = body.get("status")
        try:
            with transaction.atomic():
                with connection.cursor() as c:
                    if new_status == "maintenance":
                        c.execute(
                            """
                            UPDATE sessions
                            SET status = 'completed', ended_at = NOW()
                            WHERE workstation_id = %s AND status IN ('active', 'paused')
                            """,
                            [pk],
                        )
                    c.execute(sql, values)
        except Exception as e:
            return json_response({"error": str(e)}, 500)
        return json_response({"ok": True})
    if request.method == "DELETE":
        with connection.cursor() as c:
            c.execute("DELETE FROM workstations WHERE id = %s", [pk])
        return json_response({"ok": True})
    return json_response({"error": "Method not allowed"}, 405)


# --- clients ---


@csrf_exempt
def clients(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute("SELECT * FROM clients ORDER BY registered_at DESC")
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        name = body.get("name")
        phone = body.get("phone")
        if not name or not phone:
            return json_response({"error": "name and phone required"}, 400)
        password = _player_password_from_body(body)
        emp = getattr(request, "employee_id", None)
        if emp is None and (not password or len(password) < 4):
            return json_response(
                {"error": "Для регистрации укажите пароль не короче 4 символов"}, 400
            )
        with connection.cursor() as c:
            ensure_optional_club_schema(c)
            if password:
                c.execute(
                    """
                    INSERT INTO clients (name, phone, player_pin_hash)
                    VALUES (%s, %s, %s)
                    """,
                    [name, phone, make_password(password)],
                )
            else:
                c.execute(
                    "INSERT INTO clients (name, phone) VALUES (%s, %s)", [name, phone]
                )
            return json_response(
                {"id": c.lastrowid, "name": name, "phone": phone, "balance": 0}
            )
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def clients_search(request):
    if request.method != "POST":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request)
    if body is None:
        return json_response({"error": "Invalid JSON"}, 400)
    q = (body.get("query") or "").strip()
    if not q:
        return json_response([])
    like = f"%{q}%"
    with connection.cursor() as c:
        if q.isdigit():
            c.execute(
                """
                SELECT * FROM clients
                WHERE id = %s OR name LIKE %s OR phone LIKE %s
                ORDER BY (id = %s) DESC
                LIMIT 20
                """,
                [int(q), like, like, int(q)],
            )
        else:
            c.execute(
                "SELECT * FROM clients WHERE name LIKE %s OR phone LIKE %s LIMIT 20",
                [like, like],
            )
        return json_response(dictfetchall(c))


@csrf_exempt
def client_detail(request, pk):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute("SELECT * FROM clients WHERE id = %s", [pk])
            row = dictfetchone(c)
        if not row:
            return json_response({"error": "Not found"}, 404)
        row.pop("player_pin_hash", None)
        return json_response(row)
    if request.method == "PUT":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        fields = []
        values = []
        emp_id = getattr(request, "employee_id", None)
        with connection.cursor() as c:
            ensure_optional_club_schema(c)
            c.execute("SELECT balance FROM clients WHERE id = %s", [pk])
            prev = dictfetchone(c)
            if not prev:
                return json_response({"error": "Not found"}, 404)
            old_bal = float(prev["balance"])
            pw_raw = _player_password_from_body(body)
            if pw_raw:
                fields.append("player_pin_hash = %s")
                values.append(make_password(pw_raw))
            for key, col in [("name", "name"), ("phone", "phone"), ("balance", "balance")]:
                if key in body:
                    fields.append(f"{col} = %s")
                    values.append(body[key])
            if not fields:
                return json_response({"error": "No fields"}, 400)
            values.append(pk)
            c.execute(
                f"UPDATE clients SET {', '.join(fields)} WHERE id = %s", values
            )
            if "balance" in body:
                try:
                    new_bal = float(body["balance"])
                except (TypeError, ValueError):
                    return json_response({"error": "Invalid balance"}, 400)
                delta = new_bal - old_bal
                if abs(delta) > 0.0001:
                    if delta > 0:
                        _insert_transaction(
                            c,
                            pk,
                            delta,
                            "deposit",
                            "cash",
                            "Пополнение баланса",
                            emp_id,
                        )
                    else:
                        _insert_transaction(
                            c,
                            pk,
                            abs(delta),
                            "payment",
                            "system",
                            "Списание с баланса",
                            emp_id,
                        )
        return json_response({"ok": True})
    if request.method == "DELETE":
        with connection.cursor() as c:
            c.execute(
                """
                SELECT id FROM sessions
                WHERE client_id = %s AND status IN ('active', 'paused') LIMIT 1
                """,
                [pk],
            )
            if dictfetchone(c):
                return json_response(
                    {"error": "Нельзя удалить: у клиента активная сессия"}, 400
                )
            c.execute("DELETE FROM clients WHERE id = %s", [pk])
            if c.rowcount == 0:
                return json_response({"error": "Not found"}, 404)
        return json_response({"ok": True})
    return json_response({"error": "Method not allowed"}, 405)


# --- tariffs ---


@csrf_exempt
def tariffs(request):
    if request.method == "GET":
        with connection.cursor() as c:
            if getattr(request, "employee_id", None):
                c.execute("SELECT * FROM tariffs ORDER BY price")
            else:
                c.execute(
                    """
                    SELECT * FROM tariffs
                    WHERE (is_active IS NULL OR is_active = 1)
                    ORDER BY price
                    """
                )
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        name = body.get("name")
        price = body.get("price")
        duration_minutes = body.get("duration_minutes")
        zone = body.get("zone") or ""
        tariff_type = body.get("tariff_type") or "обычный"
        if not name or price is None or duration_minutes is None:
            return json_response({"error": "Missing fields"}, 400)
        with connection.cursor() as c:
            c.execute(
                """
                INSERT INTO tariffs
                (name, price, duration_minutes, zone, tariff_type)
                VALUES (%s,%s,%s,%s,%s)
                """,
                [name, price, duration_minutes, zone, tariff_type],
            )
            return json_response({"id": c.lastrowid})
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def tariff_detail(request, pk):
    if request.method == "PUT":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        mapping = [
            ("name", "name"),
            ("price", "price"),
            ("duration_minutes", "duration_minutes"),
            ("zone", "zone"),
            ("tariff_type", "tariff_type"),
            ("is_active", "is_active"),
        ]
        fields = []
        values = []
        for key, col in mapping:
            if key in body:
                fields.append(f"{col} = %s")
                values.append(body[key])
        if not fields:
            return json_response({"error": "No fields"}, 400)
        values.append(pk)
        with connection.cursor() as c:
            c.execute(
                f"UPDATE tariffs SET {', '.join(fields)} WHERE id = %s", values
            )
        return json_response({"ok": True})
    if request.method == "DELETE":
        with connection.cursor() as c:
            c.execute("DELETE FROM tariffs WHERE id = %s", [pk])
        return json_response({"ok": True})
    return json_response({"error": "Method not allowed"}, 405)


# --- sessions ---

# Один запрос для списка активных сессий + остаток секунд (deadline_at, пауза).
_SQL_ACTIVE_SESSIONS_ROWS = """
SELECT s.*, c.name AS client_name, w.pc_number,
  GREATEST(0,
    CASE
      WHEN s.status = 'paused' AND s.paused_at IS NOT NULL THEN
        TIMESTAMPDIFF(SECOND, s.paused_at,
          COALESCE(s.deadline_at, TIMESTAMPADD(MINUTE, s.duration_minutes, s.started_at)))
      ELSE
        TIMESTAMPDIFF(SECOND, NOW(),
          COALESCE(s.deadline_at, TIMESTAMPADD(MINUTE, s.duration_minutes, s.started_at)))
    END
  ) AS remaining_seconds
FROM sessions s
JOIN clients c ON s.client_id = c.id
JOIN workstations w ON s.workstation_id = w.id
WHERE s.status IN ('active', 'paused')
ORDER BY s.started_at DESC
"""


@csrf_exempt
def sessions_active(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(_SQL_ACTIVE_SESSIONS_ROWS)
        return json_response(dictfetchall(c))


@csrf_exempt
def sessions(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute(
                """
                SELECT s.*, c.name AS client_name, w.pc_number
                FROM sessions s
                JOIN clients c ON s.client_id = c.id
                JOIN workstations w ON s.workstation_id = w.id
                ORDER BY s.started_at DESC LIMIT 50
                """
            )
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        client_id = body.get("client_id")
        workstation_id = body.get("workstation_id")
        tariff_id = body.get("tariff_id")
        duration_minutes = body.get("duration_minutes")
        amount = body.get("amount")
        if client_id is None or workstation_id is None:
            return json_response({"error": "Missing fields"}, 400)
        try:
            amt = float(amount or 0)
        except (TypeError, ValueError):
            return json_response({"error": "Invalid amount"}, 400)
        dm = duration_minutes
        if dm is None and tariff_id:
            with connection.cursor() as c:
                c.execute(
                    """
                    SELECT duration_minutes FROM tariffs
                    WHERE id = %s AND (is_active IS NULL OR is_active = 1)
                    """,
                    [tariff_id],
                )
                tr = dictfetchone(c)
                if not tr:
                    return json_response({"error": "Тариф не найден или отключён"}, 400)
                dm = tr["duration_minutes"]
        try:
            dm = int(dm or 0)
        except (TypeError, ValueError):
            return json_response({"error": "Invalid duration"}, 400)
        if dm <= 0:
            return json_response({"error": "duration_minutes required"}, 400)
        try:
            with transaction.atomic():
                with connection.cursor() as c:
                    c.execute(
                        """
                        SELECT id FROM sessions
                        WHERE workstation_id = %s AND status IN ('active', 'paused')
                        LIMIT 1
                        """,
                        [workstation_id],
                    )
                    if dictfetchone(c):
                        return json_response(
                            {"error": "На этом ПК уже есть активная сессия"}, 400
                        )
                    if amt > 0:
                        c.execute(
                            """
                            UPDATE clients SET balance = balance - %s
                            WHERE id = %s AND balance >= %s
                            """,
                            [amt, client_id, amt],
                        )
                        if c.rowcount == 0:
                            return json_response(
                                {"error": "Недостаточно средств на балансе"}, 400
                            )
                        _insert_transaction(
                            c,
                            int(client_id),
                            amt,
                            "payment",
                            "system",
                            "Оплата сеанса",
                            getattr(request, "employee_id", None),
                        )
                    c.execute(
                        """
                        INSERT INTO sessions
                        (client_id, workstation_id, tariff_id, duration_minutes, amount,
                         deadline_at)
                        VALUES (%s,%s,%s,%s,%s, DATE_ADD(NOW(), INTERVAL %s MINUTE))
                        """,
                        [
                            client_id,
                            workstation_id,
                            tariff_id,
                            dm,
                            amt,
                            dm,
                        ],
                    )
                    sid = c.lastrowid
                    c.execute(
                        'UPDATE workstations SET status = "occupied" WHERE id = %s',
                        [workstation_id],
                    )
                    c.execute(
                        "UPDATE clients SET total_sessions = total_sessions + 1 WHERE id = %s",
                        [client_id],
                    )
                    c.execute(
                        "SELECT balance FROM clients WHERE id = %s", [client_id]
                    )
                    bal_row = dictfetchone(c)
            return json_response(
                {
                    "id": sid,
                    "client_balance": float(bal_row["balance"]),
                    "remaining_seconds": dm * 60,
                }
            )
        except Exception as e:
            return json_response({"error": str(e)}, 500)
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def session_end(request, pk):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute("SELECT * FROM sessions WHERE id = %s", [pk])
        session_row = dictfetchone(c)
    if not session_row:
        return json_response({"error": "Not found"}, 404)
    with transaction.atomic():
        with connection.cursor() as c:
            c.execute(
                'UPDATE sessions SET status = "completed", ended_at = NOW() WHERE id = %s',
                [pk],
            )
            c.execute(
                'UPDATE workstations SET status = "free" WHERE id = %s',
                [session_row["workstation_id"]],
            )
    return json_response({"ok": True})


@csrf_exempt
def session_pause(request, pk):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(
            """
            UPDATE sessions SET status = 'paused', paused_at = NOW()
            WHERE id = %s AND status = 'active'
            """,
            [pk],
        )
        if c.rowcount == 0:
            return json_response({"error": "Сессия не найдена или не активна"}, 404)
    return json_response({"ok": True})


@csrf_exempt
def session_resume(request, pk):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(
            """
            UPDATE sessions SET status = 'active',
            deadline_at = DATE_ADD(
              COALESCE(deadline_at, TIMESTAMPADD(MINUTE, duration_minutes, started_at)),
              INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND
            ),
            paused_at = NULL
            WHERE id = %s AND status = 'paused'
            """,
            [pk],
        )
        if c.rowcount == 0:
            return json_response({"error": "Сессия не на паузе"}, 404)
    return json_response({"ok": True})


@csrf_exempt
def session_extend(request, pk):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request) or {}
    try:
        minutes = int(body.get("additional_minutes", 0))
    except (TypeError, ValueError):
        return json_response({"error": "Invalid minutes"}, 400)
    if minutes <= 0:
        return json_response({"error": "additional_minutes required"}, 400)
    with connection.cursor() as c:
        c.execute(
            """
            UPDATE sessions SET
              deadline_at = DATE_ADD(
                COALESCE(deadline_at, TIMESTAMPADD(MINUTE, duration_minutes, started_at)),
                INTERVAL %s MINUTE
              ),
              duration_minutes = duration_minutes + %s
            WHERE id = %s AND status IN ('active', 'paused')
            """,
            [minutes, minutes, pk],
        )
        if c.rowcount == 0:
            return json_response({"error": "Сессия не найдена или завершена"}, 404)
    return json_response({"ok": True})


# --- products ---


@csrf_exempt
def products(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute(
                "SELECT * FROM products WHERE is_active = 1 ORDER BY name"
            )
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        name = body.get("name")
        category = body.get("category") or ""
        price = body.get("price")
        stock = body.get("stock") or 0
        image_url = body.get("image_url") or ""
        if not name or price is None:
            return json_response({"error": "Missing fields"}, 400)
        with connection.cursor() as c:
            c.execute(
                """
                INSERT INTO products (name, category, price, stock, image_url)
                VALUES (%s,%s,%s,%s,%s)
                """,
                [name, category, price, stock, image_url],
            )
            return json_response({"id": c.lastrowid})
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def product_detail(request, pk):
    if request.method == "PUT":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        mapping = [
            ("name", "name"),
            ("category", "category"),
            ("price", "price"),
            ("stock", "stock"),
            ("image_url", "image_url"),
            ("is_active", "is_active"),
        ]
        fields = []
        values = []
        for key, col in mapping:
            if key in body:
                fields.append(f"{col} = %s")
                values.append(body[key])
        if not fields:
            return json_response({"error": "No fields"}, 400)
        values.append(pk)
        with connection.cursor() as c:
            c.execute(
                f"UPDATE products SET {', '.join(fields)} WHERE id = %s", values
            )
        return json_response({"ok": True})
    if request.method == "DELETE":
        with connection.cursor() as c:
            c.execute("UPDATE products SET is_active = 0 WHERE id = %s", [pk])
        return json_response({"ok": True})
    return json_response({"error": "Method not allowed"}, 405)


# --- sales ---


@csrf_exempt
def sale_items(request, pk):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(
            """
            SELECT si.*, p.name AS product_name FROM sale_items si
            JOIN products p ON si.product_id = p.id WHERE si.sale_id = %s
            """,
            [pk],
        )
        return json_response(dictfetchall(c))


@csrf_exempt
def sales(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute(
                "SELECT * FROM sales ORDER BY created_at DESC LIMIT 50"
            )
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        items = body.get("items") or []
        total = body.get("total")
        payment_method = body.get("payment_method")
        cash_given = body.get("cash_given") or 0
        change_given = body.get("change_given") or 0
        client_id = body.get("client_id")
        if total is None or not payment_method:
            return json_response({"error": "Missing fields"}, 400)
        try:
            with transaction.atomic():
                with connection.cursor() as c:
                    c.execute(
                        """
                        INSERT INTO sales
                        (client_id, total, payment_method, cash_given, change_given)
                        VALUES (%s,%s,%s,%s,%s)
                        """,
                        [
                            client_id,
                            total,
                            payment_method,
                            cash_given,
                            change_given,
                        ],
                    )
                    sale_id = c.lastrowid
                    for item in items:
                        c.execute(
                            """
                            INSERT INTO sale_items (sale_id, product_id, quantity, price)
                            VALUES (%s,%s,%s,%s)
                            """,
                            [
                                sale_id,
                                item["product_id"],
                                item["quantity"],
                                item["price"],
                            ],
                        )
                        c.execute(
                            "UPDATE products SET stock = stock - %s WHERE id = %s",
                            [item["quantity"], item["product_id"]],
                        )
            return json_response({"id": sale_id})
        except Exception as e:
            return json_response({"error": str(e)}, 500)
    return json_response({"error": "Method not allowed"}, 405)


# --- promos ---


@csrf_exempt
def promos_apply(request):
    if request.method != "POST":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request)
    if body is None:
        return json_response({"error": "Invalid JSON"}, 400)
    code = body.get("code")
    client_id = body.get("client_id")
    if not code or client_id is None:
        return json_response({"error": "Missing fields"}, 400)
    with connection.cursor() as c:
        _deactivate_expired_promos(c)
        c.execute(
            """
            SELECT * FROM promo_codes
            WHERE code = %s AND is_active = 1
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (max_usage IS NULL OR used_count < max_usage)
            """,
            [code],
        )
        promos = dictfetchall(c)
    if not promos:
        return json_response({"error": "Промокод не найден, неактивен или истёк"}, 404)
    promo = promos[0]
    bonus_added = 0
    with connection.cursor() as c:
        c.execute(
            "UPDATE promo_codes SET used_count = used_count + 1 WHERE id = %s",
            [promo["id"]],
        )
        c.execute(
            "INSERT INTO promo_usage (promo_id, client_id) VALUES (%s, %s)",
            [promo["id"], client_id],
        )
        if promo["promo_type"] in ("bonus", "fixed"):
            try:
                bonus_added = int(float(str(promo["value"]).replace("%", "").strip()))
            except (TypeError, ValueError):
                bonus_added = 0
            if bonus_added > 0:
                c.execute(
                    "UPDATE clients SET balance = balance + %s WHERE id = %s",
                    [bonus_added, client_id],
                )
                _insert_transaction(
                    c,
                    int(client_id),
                    float(bonus_added),
                    "bonus",
                    "promo",
                    f"Промокод {code}",
                    None,
                )
        c.execute("SELECT balance FROM clients WHERE id = %s", [client_id])
        bal = dictfetchone(c)
    return json_response(
        {
            "promo_type": promo["promo_type"],
            "value": promo["value"],
            "client_balance": float(bal["balance"]) if bal else 0,
            "bonus_added": bonus_added,
        }
    )


@csrf_exempt
def promos(request):
    if request.method == "GET":
        with connection.cursor() as c:
            _deactivate_expired_promos(c)
            c.execute("SELECT * FROM promo_codes ORDER BY created_at DESC")
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        code = body.get("code")
        promo_type = body.get("promo_type")
        value = body.get("value")
        max_usage = body.get("max_usage") or 100
        expires_at = body.get("expires_at")
        if not code or not promo_type or value is None:
            return json_response({"error": "Missing fields"}, 400)
        with connection.cursor() as c:
            c.execute(
                """
                INSERT INTO promo_codes
                (code, promo_type, value, max_usage, expires_at)
                VALUES (%s,%s,%s,%s,%s)
                """,
                [code, promo_type, value, max_usage, expires_at],
            )
            return json_response({"id": c.lastrowid})
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def promo_detail(request, pk):
    if request.method == "PUT":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        mapping = [
            ("code", "code"),
            ("value", "value"),
            ("max_usage", "max_usage"),
            ("expires_at", "expires_at"),
            ("is_active", "is_active"),
        ]
        fields = []
        values = []
        for key, col in mapping:
            if key in body:
                fields.append(f"{col} = %s")
                values.append(body[key])
        if not fields:
            return json_response({"error": "No fields"}, 400)
        values.append(pk)
        with connection.cursor() as c:
            _deactivate_expired_promos(c)
            c.execute(
                f"UPDATE promo_codes SET {', '.join(fields)} WHERE id = %s", values
            )
        return json_response({"ok": True})
    if request.method == "DELETE":
        with connection.cursor() as c:
            c.execute("DELETE FROM promo_codes WHERE id = %s", [pk])
        return json_response({"ok": True})
    return json_response({"error": "Method not allowed"}, 405)


# --- tasks ---


@csrf_exempt
def tasks(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute("SELECT * FROM tasks ORDER BY created_at DESC")
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        text = body.get("text")
        priority = body.get("priority") or "medium"
        creator = body.get("creator") or ""
        if not text:
            return json_response({"error": "text required"}, 400)
        with connection.cursor() as c:
            c.execute(
                "INSERT INTO tasks (text, priority, creator) VALUES (%s,%s,%s)",
                [text, priority, creator],
            )
            return json_response({"id": c.lastrowid})
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def task_complete(request, pk):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(
            'UPDATE tasks SET status = "completed", completed_at = NOW() WHERE id = %s',
            [pk],
        )
    return json_response({"ok": True})


@csrf_exempt
def task_reopen(request, pk):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(
            'UPDATE tasks SET status = "pending", completed_at = NULL WHERE id = %s',
            [pk],
        )
    return json_response({"ok": True})


@csrf_exempt
def task_detail(request, pk):
    if request.method == "PUT":
        body = parse_json(request) or {}
        fields = []
        vals = []
        if "text" in body and body["text"] is not None:
            fields.append("text = %s")
            vals.append(str(body["text"])[:500])
        if "priority" in body and body["priority"] in ("high", "medium", "low"):
            fields.append("priority = %s")
            vals.append(body["priority"])
        if not fields:
            return json_response({"error": "No fields"}, 400)
        vals.append(pk)
        with connection.cursor() as c:
            c.execute(
                f"UPDATE tasks SET {', '.join(fields)} WHERE id = %s", vals
            )
        return json_response({"ok": True})
    if request.method == "DELETE":
        with connection.cursor() as c:
            c.execute("DELETE FROM tasks WHERE id = %s", [pk])
        return json_response({"ok": True})
    return json_response({"error": "Method not allowed"}, 405)


# --- settings ---


@csrf_exempt
def settings_view(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute("SELECT * FROM settings")
            rows = dictfetchall(c)
        obj = {r["setting_key"]: r["setting_value"] for r in rows}
        return json_response(obj)
    if request.method == "PUT":
        body = parse_json(request)
        if body is None or not isinstance(body, dict):
            return json_response({"error": "Invalid JSON"}, 400)
        with connection.cursor() as c:
            for key, value in body.items():
                c.execute(
                    """
                    INSERT INTO settings (setting_key, setting_value)
                    VALUES (%s, %s)
                    ON DUPLICATE KEY UPDATE setting_value = %s
                    """,
                    [key, str(value), str(value)],
                )
        return json_response({"ok": True})
    return json_response({"error": "Method not allowed"}, 405)


# --- stats ---


@csrf_exempt
def stats_dashboard(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    try:
        with connection.cursor() as c:
            c.execute(
                """
                SELECT
                    COUNT(*) AS total,
                    SUM(status = 'free') AS free_count,
                    SUM(status = 'occupied') AS occupied_count,
                    SUM(status = 'maintenance') AS maintenance_count
                FROM workstations
                """
            )
            pc_stats = dictfetchone(c)

            c.execute(_SQL_ACTIVE_SESSIONS_ROWS)
            active_sessions = dictfetchall(c)

            c.execute(
                """
                SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS count
                FROM sales WHERE DATE(created_at) = CURDATE()
                """
            )
            today_sales = dictfetchone(c)

            c.execute(
                """
                SELECT COUNT(*) AS count FROM sessions
                WHERE DATE(started_at) = CURDATE()
                """
            )
            today_sessions = dictfetchone(c)

            c.execute(
                """
                SELECT s.*, GROUP_CONCAT(CONCAT(p.name, ' x', si.quantity) SEPARATOR ', ')
                    AS items_text
                FROM sales s
                LEFT JOIN sale_items si ON si.sale_id = s.id
                LEFT JOIN products p ON si.product_id = p.id
                GROUP BY s.id
                ORDER BY s.created_at DESC LIMIT 5
                """
            )
            recent_sales = dictfetchall(c)

            c.execute(
                """
                SELECT * FROM tasks WHERE status = 'pending'
                ORDER BY created_at DESC LIMIT 5
                """
            )
            recent_tasks = dictfetchall(c)

            c.execute(
                """
                SELECT COALESCE(SUM(total), 0) AS revenue
                FROM sales WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                """
            )
            yesterday_sales = dictfetchone(c)

            c.execute(
                """
                SELECT COUNT(*) AS count FROM sessions
                WHERE DATE(started_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                """
            )
            yesterday_sessions = dictfetchone(c)

        today_rev = float(today_sales["revenue"])
        yest_rev = float(yesterday_sales["revenue"])
        if yest_rev > 0:
            revenue_trend_pct = round((today_rev - yest_rev) / yest_rev * 100)
        else:
            revenue_trend_pct = round(100 if today_rev > 0 else 0)

        today_sess_cnt = int(today_sessions["count"])
        yest_sess_cnt = int(yesterday_sessions["count"])
        if yest_sess_cnt > 0:
            sessions_trend_pct = round(
                (today_sess_cnt - yest_sess_cnt) / yest_sess_cnt * 100
            )
        else:
            sessions_trend_pct = round(100 if today_sess_cnt > 0 else 0)

        return json_response(
            {
                "pcs": pc_stats,
                "activeSessions": active_sessions,
                "todayRevenue": today_sales["revenue"],
                "todaySalesCount": today_sales["count"],
                "todaySessionsCount": today_sessions["count"],
                "recentSales": recent_sales,
                "recentTasks": recent_tasks,
                "revenueTrendPct": revenue_trend_pct,
                "sessionsTrendPct": sessions_trend_pct,
            }
        )
    except Exception as e:
        return json_response({"error": str(e)}, 500)


@csrf_exempt
def stats_analytics(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    period = request.GET.get("period") or "week"
    days = 7
    if period == "day":
        days = 1
    elif period == "month":
        days = 30
    try:
        with connection.cursor() as c:
            c.execute(
                """
                SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
                FROM sales WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                """,
                [days],
            )
            revenue = dictfetchone(c)

            c.execute(
                """
                SELECT COUNT(*) AS count FROM sessions
                WHERE started_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                """,
                [days],
            )
            sessions = dictfetchone(c)

            c.execute(
                """
                SELECT COUNT(*) AS count FROM clients
                WHERE registered_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                """,
                [days],
            )
            clients = dictfetchone(c)

            c.execute(
                """
                SELECT DATE(created_at) AS day, COALESCE(SUM(total), 0) AS rev
                FROM sales WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY DATE(created_at) ORDER BY day
                """,
                [days],
            )
            daily_revenue = dictfetchall(c)

            c.execute(
                """
                SELECT HOUR(started_at) AS hr, COUNT(*) AS cnt
                FROM sessions WHERE started_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY HOUR(started_at) ORDER BY hr
                """,
                [days],
            )
            hourly_load = dictfetchall(c)

            c.execute(
                """
                SELECT c.name, COUNT(s.id) AS sessions, COALESCE(SUM(s.amount), 0) AS spent
                FROM clients c
                LEFT JOIN sessions s ON s.client_id = c.id
                    AND s.started_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY c.id HAVING sessions > 0
                ORDER BY sessions DESC LIMIT 5
                """,
                [days],
            )
            top_clients = dictfetchall(c)

            c.execute(
                """
                SELECT z.name AS zone, COUNT(s.id) AS cnt, COALESCE(SUM(s.amount), 0) AS rev
                FROM zones z
                LEFT JOIN workstations w ON w.zone_id = z.id
                LEFT JOIN sessions s ON s.workstation_id = w.id
                    AND s.started_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY z.id
                """,
                [days],
            )
            zone_revenue = dictfetchall(c)

            c.execute(
                """
                SELECT DATE(started_at) AS day, COUNT(*) AS sessions
                FROM sessions
                WHERE started_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY DATE(started_at) ORDER BY day
                """,
                [days],
            )
            daily_sessions = dictfetchall(c)

            c.execute(
                """
                SELECT COALESCE(AVG(duration_minutes), 0) AS avg_min
                FROM sessions
                WHERE started_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                """,
                [days],
            )
            avg_sess = dictfetchone(c)

            c.execute(
                """
                SELECT DATE(registered_at) AS day, COUNT(*) AS newc
                FROM clients
                WHERE registered_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
                GROUP BY DATE(registered_at) ORDER BY day
                """,
                [days],
            )
            daily_regs = dictfetchall(c)

        sess_by_day = {str(r["day"]): int(r["sessions"]) for r in daily_sessions}
        reg_by_day = {str(r["day"]): int(r["newc"]) for r in daily_regs}
        max_sess = max(sess_by_day.values(), default=0) or 1

        daily_detail = []
        for r in daily_revenue:
            day = str(r["day"])
            sc = sess_by_day.get(day, 0)
            daily_detail.append(
                {
                    "day": day,
                    "revenue": float(r["rev"]),
                    "sessions": sc,
                    "newClients": reg_by_day.get(day, 0),
                    "loadPct": min(100, round(sc / max_sess * 100)),
                }
            )

        hourly_arr = []
        for i in range(24):
            found = next((h for h in hourly_load if h["hr"] == i), None)
            hourly_arr.append({"hour": i, "count": found["cnt"] if found else 0})
        max_hourly = max((h["count"] for h in hourly_arr), default=0) or 1

        return json_response(
            {
                "revenue": float(revenue["total"]),
                "salesCount": int(revenue["count"]),
                "sessionsCount": int(sessions["count"]),
                "newClients": int(clients["count"]),
                "avgSessionMinutes": round(float(avg_sess["avg_min"]), 1),
                "dailyRevenue": [
                    {"day": str(r["day"]), "rev": float(r["rev"])} for r in daily_revenue
                ],
                "hourlyLoad": [
                    {
                        "hour": f"{h['hour']:02d}:00",
                        "load": round((h["count"] / max_hourly) * 100),
                    }
                    for h in hourly_arr
                ],
                "topClients": [
                    {
                        "name": c["name"],
                        "sessions": c["sessions"],
                        "spent": float(c["spent"]),
                    }
                    for c in top_clients
                ],
                "zoneRevenue": [
                    {
                        "zone": z["zone"],
                        "count": z["cnt"],
                        "revenue": float(z["rev"]),
                    }
                    for z in zone_revenue
                ],
                "dailyDetail": daily_detail,
            }
        )
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# --- orders ---


@csrf_exempt
def orders(request):
    if request.method == "GET":
        with connection.cursor() as c:
            c.execute(
                """
                SELECT po.*, c.name AS client_name, w.pc_number, p.name AS product_name
                FROM player_orders po
                JOIN clients c ON po.client_id = c.id
                JOIN workstations w ON po.workstation_id = w.id
                JOIN products p ON po.product_id = p.id
                ORDER BY po.created_at DESC LIMIT 50
                """
            )
            return json_response(dictfetchall(c))
    if request.method == "POST":
        body = parse_json(request)
        if body is None:
            return json_response({"error": "Invalid JSON"}, 400)
        client_id = body.get("client_id")
        workstation_id = body.get("workstation_id")
        product_id = body.get("product_id")
        quantity = body.get("quantity") or 1
        if client_id is None or workstation_id is None or product_id is None:
            return json_response({"error": "Missing fields"}, 400)
        try:
            qty = int(quantity)
        except (TypeError, ValueError):
            return json_response({"error": "Invalid quantity"}, 400)
        if qty < 1:
            return json_response({"error": "Invalid quantity"}, 400)
        with connection.cursor() as c:
            c.execute(
                "SELECT price, stock FROM products WHERE id = %s AND is_active = 1",
                [product_id],
            )
            pr = dictfetchone(c)
        if not pr:
            return json_response({"error": "Товар не найден"}, 404)
        if int(pr["stock"]) < qty:
            return json_response({"error": "Недостаточно на складе"}, 400)
        total = float(pr["price"]) * qty
        try:
            with transaction.atomic():
                with connection.cursor() as c:
                    c.execute(
                        """
                        UPDATE clients SET balance = balance - %s
                        WHERE id = %s AND balance >= %s
                        """,
                        [total, client_id, total],
                    )
                    if c.rowcount == 0:
                        return json_response(
                            {"error": "Недостаточно средств на балансе"}, 400
                        )
                    _insert_transaction(
                        c,
                        int(client_id),
                        total,
                        "payment",
                        "system",
                        "Заказ с баланса (бар)",
                        getattr(request, "employee_id", None),
                    )
                    c.execute(
                        """
                        INSERT INTO player_orders
                        (client_id, workstation_id, product_id, quantity)
                        VALUES (%s,%s,%s,%s)
                        """,
                        [client_id, workstation_id, product_id, qty],
                    )
                    oid = c.lastrowid
                    c.execute(
                        "SELECT w.pc_number, p.name AS product_name FROM workstations w, products p WHERE w.id = %s AND p.id = %s",
                        [workstation_id, product_id],
                    )
                    meta = dictfetchone(c)
                    pcn = meta["pc_number"] if meta else workstation_id
                    pnm = (meta or {}).get("product_name") or "Товар"
                    insert_club_notification(
                        c,
                        "order",
                        "Новый заказ",
                        f"{pnm} ×{qty} · ПК {str(pcn).zfill(2)}",
                        int(oid),
                    )
                    c.execute(
                        "SELECT balance FROM clients WHERE id = %s", [client_id]
                    )
                    bal = dictfetchone(c)
            return json_response(
                {"id": oid, "client_balance": float(bal["balance"])}
            )
        except Exception as e:
            return json_response({"error": str(e)}, 500)
    return json_response({"error": "Method not allowed"}, 405)


@csrf_exempt
def order_complete(request, pk):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute('UPDATE player_orders SET status = "done" WHERE id = %s', [pk])
    return json_response({"ok": True})


@csrf_exempt
def order_cancel(request, pk):
    if request.method != "PUT":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        c.execute(
            'UPDATE player_orders SET status = "cancelled" WHERE id = %s', [pk]
        )
    return json_response({"ok": True})
