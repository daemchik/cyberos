"""Live snapshot, CSV export, workstation commands, PC agent poll."""
from __future__ import annotations

import csv
import io
import os
from datetime import datetime

from django.db import connection
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from api.optional_schema import ensure_optional_club_schema
from api.sql_views import (
    dictfetchall,
    dictfetchone,
    insert_club_notification,
    json_response,
    parse_json,
)


@csrf_exempt
def live_snapshot(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    with connection.cursor() as c:
        ensure_optional_club_schema(c)
        c.execute(
            """
            SELECT w.*, z.name AS zone_name, z.color AS zone_color
            FROM workstations w JOIN zones z ON w.zone_id = z.id
            ORDER BY w.pc_number
            """
        )
        workstations = dictfetchall(c)
        c.execute(
            "SELECT COUNT(*) AS c FROM player_orders WHERE status = 'pending'"
        )
        pending_orders = int(dictfetchone(c)["c"])
        c.execute(
            """
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
        )
        active_sessions = dictfetchall(c)
        c.execute(
            """
            SELECT o.*, p.name AS product_name, w.pc_number
            FROM player_orders o
            JOIN products p ON p.id = o.product_id
            JOIN workstations w ON w.id = o.workstation_id
            WHERE o.status = 'pending'
            ORDER BY o.id DESC
            LIMIT 30
            """
        )
        pending_order_rows = dictfetchall(c)
        c.execute(
            """
            SELECT wc.*, w.pc_number
            FROM workstation_commands wc
            JOIN workstations w ON w.id = wc.workstation_id
            WHERE wc.status = 'pending' AND wc.command_type = 'call_admin'
            ORDER BY wc.id DESC
            LIMIT 20
            """
        )
        pending_admin_calls = dictfetchall(c)
    return json_response(
        {
            "workstations": workstations,
            "pending_orders": pending_orders,
            "pending_order_rows": pending_order_rows,
            "pending_admin_calls": pending_admin_calls,
            "active_sessions": active_sessions,
        }
    )


@csrf_exempt
def stats_export_csv(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    period = request.GET.get("period") or "week"
    days = 7
    if period == "day":
        days = 1
    elif period == "month":
        days = 30
    with connection.cursor() as c:
        c.execute(
            """
            SELECT DATE(created_at) AS day, COALESCE(SUM(total), 0) AS rev, COUNT(*) AS cnt
            FROM sales WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
            GROUP BY DATE(created_at) ORDER BY day
            """,
            [days],
        )
        rows = dictfetchall(c)
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["day", "revenue", "sales_count"])
    for r in rows:
        w.writerow([r["day"], float(r["rev"]), r["cnt"]])
    resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = (
        f'attachment; filename="cyberos-analytics-{period}.csv"'
    )
    return resp


@csrf_exempt
def workstation_command(request, pk):
    if request.method != "POST":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request) or {}
    cmd = (body.get("command") or body.get("type") or "").strip().lower()
    allowed = {"wol", "screenshot", "lock", "unlock", "call_admin"}
    if cmd not in allowed:
        return json_response({"error": "Unknown command"}, 400)
    payload = body.get("payload") or ""
    with connection.cursor() as c:
        c.execute("SELECT id FROM workstations WHERE id = %s", [pk])
        if not dictfetchone(c):
            return json_response({"error": "ПК не найден"}, 404)
        c.execute(
            """
            INSERT INTO workstation_commands
            (workstation_id, command_type, payload, status)
            VALUES (%s, %s, %s, 'pending')
            """,
            [pk, cmd, str(payload)[:2000]],
        )
        cid = c.lastrowid
        if cmd == "call_admin":
            c.execute("SELECT pc_number FROM workstations WHERE id = %s", [pk])
            row = dictfetchone(c)
            pcn = row["pc_number"] if row else pk
            insert_club_notification(
                c,
                "call",
                "Вызов администратора",
                f"ПК {str(pcn).zfill(2)}",
                int(cid),
            )
    return json_response({"id": cid, "command": cmd, "status": "pending"})


@csrf_exempt
def agent_pending(request):
    if request.method != "GET":
        return json_response({"error": "Method not allowed"}, 405)
    try:
        ws_id = int(request.GET.get("workstation_id") or "0")
    except (TypeError, ValueError):
        return json_response({"error": "workstation_id required"}, 400)
    if ws_id <= 0:
        return json_response({"error": "workstation_id required"}, 400)
    limit = min(int(request.GET.get("limit") or "10"), 50)
    with connection.cursor() as c:
        c.execute(
            """
            SELECT * FROM workstation_commands
            WHERE workstation_id = %s AND status = 'pending'
            ORDER BY id ASC LIMIT %s
            """,
            [ws_id, limit],
        )
        rows = dictfetchall(c)
    return json_response({"commands": rows})


@csrf_exempt
def agent_ack(request):
    if request.method != "POST":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request) or {}
    try:
        cid = int(body.get("id"))
    except (TypeError, ValueError):
        return json_response({"error": "id required"}, 400)
    status = (body.get("status") or "done").lower()
    if status not in ("done", "failed"):
        status = "done"
    result = str(body.get("result") or "")[:4000]
    ws_id = body.get("workstation_id")
    ws_raw = body.get("workstation_id")
    try:
        ws_id = int(ws_raw) if ws_raw is not None and ws_raw != "" else None
    except (TypeError, ValueError):
        ws_id = None
    with connection.cursor() as c:
        if ws_id is not None:
            c.execute(
                """
                UPDATE workstation_commands SET status = %s, result = %s
                WHERE id = %s AND workstation_id = %s
                """,
                [status, result, cid, ws_id],
            )
        else:
            c.execute(
                """
                UPDATE workstation_commands SET status = %s, result = %s
                WHERE id = %s
                """,
                [status, result, cid],
            )
        if c.rowcount == 0:
            return json_response({"error": "Not found"}, 404)
    return json_response({"ok": True})


@csrf_exempt
def agent_heartbeat(request):
    if request.method != "POST":
        return json_response({"error": "Method not allowed"}, 405)
    body = parse_json(request) or {}
    try:
        ws_id = int(body.get("workstation_id"))
    except (TypeError, ValueError):
        return json_response({"error": "workstation_id required"}, 400)
    ver = str(body.get("version") or os.environ.get("AGENT_VERSION", "stub"))[:50]
    with connection.cursor() as c:
        try:
            c.execute(
                """
                UPDATE workstations SET
                  last_agent_ping = NOW(),
                  agent_version = %s
                WHERE id = %s
                """,
                [ver, ws_id],
            )
        except Exception:
            c.execute("SELECT id FROM workstations WHERE id = %s", [ws_id])
            if not dictfetchone(c):
                return json_response({"error": "Unknown workstation"}, 404)
            return json_response({"ok": True, "note": "last_agent_ping column missing; run schema_upgrade_v2.sql"})
        if c.rowcount == 0:
            return json_response({"error": "Unknown workstation"}, 404)
    return json_response({"ok": True})
