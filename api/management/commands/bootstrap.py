"""
Одна команда: создать БД MySQL (если нужно), migrate, schema.sql, seed_demo.

  python manage.py bootstrap

Без MySQL (MYSQL_USE=false): только migrate (клубный UI не заработает).
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import sqlparse
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection, connections

from api.optional_schema import ensure_optional_club_schema


def _schema_path() -> Path:
    return Path(settings.BASE_DIR) / "backend" / "schema.sql"


def _ensure_mysql_database() -> None:
    import pymysql

    db = settings.DATABASES["default"]
    name = str(db["NAME"]).replace("`", "")
    conn = pymysql.connect(
        host=db.get("HOST") or "127.0.0.1",
        port=int(db.get("PORT") or 3306),
        user=db.get("USER") or "root",
        password=db.get("PASSWORD") or "",
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{name}` "
                "DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.commit()
    finally:
        conn.close()


def _mysql_cli_import(schema_path: Path) -> bool:
    mysql = shutil.which("mysql")
    if not mysql:
        return False
    db = settings.DATABASES["default"]
    name = str(db["NAME"])
    host = db.get("HOST") or "127.0.0.1"
    port = str(int(db.get("PORT") or 3306))
    user = db.get("USER") or "root"
    password = db.get("PASSWORD") or ""

    raw = schema_path.read_text(encoding="utf-8")
    raw = re.sub(
        r"(?i)^\s*USE\s+\w+\s*;",
        f"USE `{name.replace('`', '')}`;\n",
        raw,
        count=1,
    )

    tmp = tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", suffix=".sql", delete=False
    )
    try:
        tmp.write(raw)
        tmp.close()
        env = os.environ.copy()
        if password:
            env["MYSQL_PWD"] = str(password)
        cmd = [mysql, "-h", host, "-P", port, "-u", user, name]
        r = subprocess.run(
            cmd,
            stdin=open(tmp.name, "rb"),
            env=env,
            capture_output=True,
            timeout=180,
        )
        return r.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


def _apply_schema_creates_only(schema_path: Path, stderr) -> None:
    raw = schema_path.read_text(encoding="utf-8")
    raw = re.sub(r"^\s*USE\s+\w+\s*;\s*", "", raw, flags=re.I | re.MULTILINE)
    for stmt in sqlparse.split(raw):
        s = stmt.strip()
        if not s or s.startswith("--"):
            continue
        u = s.lstrip().upper()
        if not u.startswith("CREATE"):
            continue
        try:
            with connection.cursor() as c:
                c.execute(s)
        except Exception as e:
            err = str(e)
            if "1050" in err or "already exists" in err.lower():
                continue
            stderr.write(f"[schema] {e}\n")


def _has_club_tables() -> bool:
    try:
        with connection.cursor() as c:
            c.execute("SHOW TABLES LIKE 'zones'")
            return c.fetchone() is not None
    except Exception:
        return False


class Command(BaseCommand):
    help = "Инициализация: БД MySQL → migrate → schema.sql → seed_demo"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-schema",
            action="store_true",
            help="Не применять schema.sql (только migrate + seed_demo)",
        )

    def handle(self, *args, **options):
        skip_schema = options["skip_schema"]
        db = settings.DATABASES["default"]
        is_mysql = db["ENGINE"] == "django.db.backends.mysql"

        if is_mysql:
            self.stdout.write("Создание БД MySQL (если нет)…")
            try:
                _ensure_mysql_database()
            except Exception as e:
                self.stderr.write(
                    self.style.ERROR(
                        f"MySQL: {e}\n"
                        "Запустите сервер MySQL и проверьте MYSQL_DB_HOST, MYSQL_DB_USER, MYSQL_DB_PASSWORD.\n"
                    )
                )
                raise SystemExit(1) from e
            connections.close_all()

        self.stdout.write("Django migrate…")
        call_command("migrate", "--noinput", verbosity=0)

        schema = _schema_path()
        if is_mysql and not skip_schema and schema.exists():
            self.stdout.write(f"Импорт схемы: {schema}")
            if _mysql_cli_import(schema):
                self.stdout.write(self.style.SUCCESS("schema.sql загружен (mysql)."))
            else:
                self.stdout.write(
                    "mysql.exe не найден или ошибка импорта — применяю только CREATE…"
                )
                _apply_schema_creates_only(schema, self.stderr)
                self.stdout.write(self.style.WARNING("Проверьте импорт вручную: .\\scripts\\mysql-import-schema.ps1"))
            connections.close_all()
        elif is_mysql and skip_schema:
            self.stdout.write("Пропуск импорта schema.sql (--skip-schema).")
        elif is_mysql and not schema.exists():
            self.stderr.write(self.style.WARNING(f"Нет файла {schema}"))

        if not is_mysql:
            self.stdout.write(
                self.style.WARNING(
                    "MYSQL_USE=false: миграции Django применены. Клубный API нужен MySQL — "
                    "set MYSQL_USE=true и снова: python manage.py bootstrap"
                )
            )
            return

        if not _has_club_tables():
            self.stderr.write(
                self.style.ERROR(
                    "Таблица «zones» не найдена. Импортируйте backend/schema.sql "
                    "(см. scripts\\mysql-import-schema.ps1) и повторите bootstrap.\n"
                    "Либо: python manage.py bootstrap (без --skip-schema) при установленном mysql.exe в PATH."
                )
            )
            raise SystemExit(1)

        self.stdout.write("Патчи схемы (колонки sessions/workstations/…)…")
        with connection.cursor() as c:
            ensure_optional_club_schema(c)
        connections.close_all()

        self.stdout.write("Демо-данные (seed_demo)…")
        call_command("seed_demo", verbosity=1)

        self.stdout.write(
            self.style.SUCCESS(
                "\n=== Готово ===\n"
                "  API:    python manage.py runserver 127.0.0.1:8000\n"
                "  Фронт:  cd cyberos && npm run dev\n"
                "  Вход в админку:  admin / admin\n"
            )
        )
