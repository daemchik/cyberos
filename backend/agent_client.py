#!/usr/bin/env python3
"""
Заглушка агента на ПК клуба: опрос команд, heartbeat, подтверждение.
Реальные WoL / скрин / блокировку ОС подключайте здесь вместо noop.

Запуск:
  set AGENT_SHARED_SECRET=...
  set API_BASE=http://127.0.0.1:8000/api
  python agent_client.py --workstation-id 1
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request


def req(method: str, path: str, body: dict | None = None) -> dict:
    base = os.environ.get("API_BASE", "http://127.0.0.1:8000/api").rstrip("/")
    url = f"{base}{path}"
    data = None
    headers = {
        "X-Agent-Token": os.environ.get("AGENT_SHARED_SECRET", "dev-agent-secret"),
        "Content-Type": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--workstation-id", type=int, required=True)
    args = p.parse_args()
    ws = args.workstation_id
    while True:
        try:
            req("POST", "/agent/heartbeat", {"workstation_id": ws, "version": "agent_client/0.1"})
            pending = req("GET", f"/agent/pending?workstation_id={ws}&limit=5")
            for cmd in pending.get("commands") or []:
                cid = cmd["id"]
                ctype = cmd["command_type"]
                # Заглушки: реализуйте вызовы ОС здесь
                result = f"noop:{ctype}"
                req("POST", "/agent/ack", {"id": cid, "workstation_id": ws, "status": "done", "result": result})
        except Exception as e:
            print("agent error:", e, file=sys.stderr)
        time.sleep(5)


if __name__ == "__main__":
    main()
