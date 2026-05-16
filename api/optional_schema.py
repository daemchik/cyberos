"""DDL-патчи для клубной MySQL (старые базы без части колонок из актуального schema.sql)."""


def ensure_optional_club_schema(cursor) -> None:
    try:
        cursor.execute("SHOW TABLES LIKE 'workstations'")
        if not cursor.fetchone():
            return
    except Exception:
        return
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS workstation_commands (
              id INT AUTO_INCREMENT PRIMARY KEY,
              workstation_id INT NOT NULL,
              command_type ENUM('wol', 'screenshot', 'lock', 'unlock', 'call_admin') NOT NULL,
              payload TEXT,
              status ENUM('pending', 'done', 'failed') DEFAULT 'pending',
              result TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_ws (workstation_id),
              INDEX idx_status (status)
            ) ENGINE=InnoDB
            """
        )
    except Exception:
        pass
    for ddl in (
        "ALTER TABLE sessions ADD COLUMN paused_at TIMESTAMP NULL",
        "ALTER TABLE sessions ADD COLUMN deadline_at TIMESTAMP NULL",
        "ALTER TABLE workstations ADD COLUMN last_agent_ping TIMESTAMP NULL",
        "ALTER TABLE workstations ADD COLUMN agent_version VARCHAR(50) DEFAULT ''",
        "ALTER TABLE transactions ADD COLUMN shift_id INT NULL",
        # Имя колонки историческое: хранится хеш пароля входа игрока (/player).
        "ALTER TABLE clients ADD COLUMN player_pin_hash VARCHAR(255) NULL",
    ):
        try:
            cursor.execute(ddl)
        except Exception:
            pass
    ensure_club_notifications_table(cursor)


def ensure_club_notifications_table(cursor) -> None:
    """Лента уведомлений админки (независимо от патчей клубной схемы)."""
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS club_notifications (
              id INT AUTO_INCREMENT PRIMARY KEY,
              kind VARCHAR(32) NOT NULL,
              ref_id INT NULL,
              title VARCHAR(200) NOT NULL,
              detail TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              read_at TIMESTAMP NULL,
              INDEX idx_cn_created (created_at),
              INDEX idx_cn_read (read_at)
            ) ENGINE=InnoDB
            """
        )
    except Exception:
        pass
