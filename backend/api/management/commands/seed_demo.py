"""Сброс демо-данных и заполнение таблиц (аналог бывшего seed.js)."""

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Очистить ключевые таблицы и загрузить демо-данные (зоны, ПК, тарифы, товары, промо, настройки)."

    def handle(self, *args, **options):
        with connection.cursor() as c:
            c.execute("SET FOREIGN_KEY_CHECKS = 0")
            for table in (
                "workstation_commands",
                "workstations",
                "tariffs",
                "products",
                "promo_codes",
                "settings",
                "zones",
                "employees",
            ):
                try:
                    c.execute(f"TRUNCATE TABLE {table}")
                except Exception as e:
                    self.stderr.write(f"TRUNCATE {table}: {e}")
            c.execute("SET FOREIGN_KEY_CHECKS = 1")

            c.execute(
                "INSERT INTO zones (name, color) VALUES (%s, %s), (%s, %s)",
                ["VIP", "#A855F7", "Стандарт", "#71717A"],
            )
            admin_hash = make_password("admin")
            c.execute(
                """
                INSERT INTO employees (name, login, password_hash, role)
                VALUES (%s, %s, %s, %s)
                """,
                ["Администратор", "admin", admin_hash, "owner"],
            )
            c.execute(
                """
                INSERT INTO tariffs (name, price, duration_minutes, zone, tariff_type) VALUES
                ('1 час', 100, 60, 'Стандарт', 'обычный'),
                ('2 часа', 180, 120, 'Стандарт', 'обычный'),
                ('3 часа', 250, 180, 'Стандарт', 'обычный'),
                ('Ночной', 500, 480, 'Стандарт', 'пакет'),
                ('Пакет 5ч', 400, 300, 'Стандарт', 'пакет')
                """
            )
            c.execute(
                """
                INSERT INTO products (name, category, price, stock) VALUES
                ('Adrenaline Rush 0.45L', 'Напитки', 150, 45),
                ('Snickers Super', 'Снеки', 85, 12),
                ('Lay''s Краб 140г', 'Снеки', 180, 85),
                ('Коврик SteelSeries Qck', 'Железо', 1500, 5),
                ('Cyber Coffee XXL', 'Горячее', 120, 150),
                ('Вафельный батончик', 'Снеки', 45, 30)
                """
            )
            c.execute(
                """
                INSERT INTO promo_codes (code, promo_type, value, max_usage, expires_at) VALUES
                ('CYBER2024', 'discount', '20%', 100, '2026-12-31'),
                ('NIGHT_OWL', 'fixed', '500', 100, '2026-12-31'),
                ('START2026', 'bonus', '200', 50, '2026-06-01')
                """
            )
            c.execute(
                """
                INSERT INTO settings (setting_key, setting_value) VALUES
                ('accent_color', '#00FF00'),
                ('font_family', 'JetBrains Mono'),
                ('font_size', '12'),
                ('dark_mode', 'true'),
                ('auto_logout_minutes', '30'),
                ('language', 'ru'),
                ('price_per_minute', '2'),
                ('admin_ip', '192.168.0.100'),
                ('sec_two_factor', 'true'),
                ('sec_network_isolation', 'true'),
                ('sec_auto_purge', 'false'),
                ('sec_usb_block', 'false'),
                ('notifications', 'true')
                """
            )

            c.execute("SELECT id, name FROM zones")
            zones = {row[1]: row[0] for row in c.fetchall()}
            vip_id = zones["VIP"]
            std_id = zones["Стандарт"]

            for i in range(1, 41):
                c.execute(
                    """
                    INSERT INTO workstations
                    (pc_number, zone_id, ip_address, status, grid_position, cpu, gpu, ram)
                    VALUES (%s, %s, %s, 'free', %s, %s, %s, %s)
                    """,
                    [
                        i,
                        vip_id if i <= 10 else std_id,
                        f"192.168.0.{100 + i}",
                        i - 1,
                        "AMD Ryzen 7 5800H",
                        "Nvidia RTX 3070",
                        "32GB",
                    ],
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Готово: 40 ПК, 5 тарифов, 6 товаров, 3 промокода, настройки, зоны, сотрудник."
            )
        )
