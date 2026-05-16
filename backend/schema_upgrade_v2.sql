-- Миграция для существующей БД MySQL (cyberos). Выполнить один раз; при «Duplicate column» пропустить соответствующий ALTER.
USE cyberos;

ALTER TABLE sessions ADD COLUMN paused_at TIMESTAMP NULL;
ALTER TABLE sessions ADD COLUMN deadline_at TIMESTAMP NULL;

ALTER TABLE workstations ADD COLUMN last_agent_ping TIMESTAMP NULL;
ALTER TABLE workstations ADD COLUMN agent_version VARCHAR(50) DEFAULT '';

ALTER TABLE transactions ADD COLUMN shift_id INT NULL;

CREATE TABLE IF NOT EXISTS workstation_commands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workstation_id INT NOT NULL,
  command_type ENUM('wol', 'screenshot', 'lock', 'unlock', 'call_admin') NOT NULL,
  payload TEXT,
  status ENUM('pending', 'done', 'failed') DEFAULT 'pending',
  result TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workstation_id) REFERENCES workstations(id)
) ENGINE=InnoDB;
