-- Имя БД должно совпадать с DB_NAME в backend/.env (по умолчанию: cyberos)
USE cyberos;

-- Зоны зала
CREATE TABLE zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#00FF00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Рабочие станции (ПК)
CREATE TABLE workstations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pc_number INT NOT NULL UNIQUE,
  zone_id INT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  status ENUM('free', 'occupied', 'maintenance') DEFAULT 'free',
  grid_position INT DEFAULT 0,
  cpu VARCHAR(100) DEFAULT '',
  gpu VARCHAR(100) DEFAULT '',
  ram VARCHAR(50) DEFAULT '',
  last_agent_ping TIMESTAMP NULL,
  agent_version VARCHAR(50) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id)
) ENGINE=InnoDB;

-- Клиенты
CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_sessions INT DEFAULT 0,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Сотрудники / Администраторы
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  login VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'operator') DEFAULT 'operator',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Тарифы
CREATE TABLE tariffs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  zone VARCHAR(100) DEFAULT '',
  tariff_type VARCHAR(50) DEFAULT 'обычный',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Сессии (игровые сеансы)
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  workstation_id INT NOT NULL,
  tariff_id INT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  paused_at TIMESTAMP NULL,
  deadline_at TIMESTAMP NULL,
  duration_minutes INT DEFAULT 0,
  amount DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('active', 'paused', 'completed') DEFAULT 'active',
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (workstation_id) REFERENCES workstations(id),
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id)
) ENGINE=InnoDB;

-- Товары (маркет)
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  image_url VARCHAR(500) DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Продажи (чеки) - теперь без привязки к сменам
CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT,
  total DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash', 'card', 'sbp', 'balance') NOT NULL,
  cash_given DECIMAL(10,2) DEFAULT 0.00,
  change_given DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

-- Позиции продажи
CREATE TABLE sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Поставки
CREATE TABLE supplies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  supplier VARCHAR(200) DEFAULT '',
  employee_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

-- Заказы от игроков (через ПК)
CREATE TABLE player_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  workstation_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 1,
  status ENUM('pending', 'done', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (workstation_id) REFERENCES workstations(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Промокоды
CREATE TABLE promo_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  promo_type ENUM('discount', 'fixed', 'bonus') NOT NULL,
  value VARCHAR(50) NOT NULL,
  max_usage INT DEFAULT 100,
  used_count INT DEFAULT 0,
  expires_at DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Использование промокодов
CREATE TABLE promo_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  promo_id INT NOT NULL,
  client_id INT NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promo_id) REFERENCES promo_codes(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

-- Транзакции баланса клиента - теперь без привязки к сменам
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type ENUM('deposit', 'payment', 'refund', 'bonus') NOT NULL,
  method ENUM('cash', 'card', 'sbp', 'promo', 'system') DEFAULT 'cash',
  description VARCHAR(255) DEFAULT '',
  employee_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

-- Команды агенту на ПК (WoL, скрин, блокировка и т.д.)
CREATE TABLE workstation_commands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workstation_id INT NOT NULL,
  command_type ENUM('wol', 'screenshot', 'lock', 'unlock', 'call_admin') NOT NULL,
  payload TEXT,
  status ENUM('pending', 'done', 'failed') DEFAULT 'pending',
  result TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workstation_id) REFERENCES workstations(id)
) ENGINE=InnoDB;

-- Задачи администратора
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(500) NOT NULL,
  priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
  status ENUM('pending', 'completed') DEFAULT 'pending',
  creator VARCHAR(100) DEFAULT '',
  assigned_to INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (assigned_to) REFERENCES employees(id)
) ENGINE=InnoDB;

-- Системные настройки
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===== НАЧАЛЬНЫЕ ДАННЫЕ =====

INSERT INTO zones (name, color) VALUES
  ('VIP', '#A855F7'),
  ('Стандарт', '#71717A');

INSERT INTO employees (name, login, password_hash, role) VALUES
  ('Администратор', 'admin', 'pbkdf2_sha256$1000000$Hl1uZjJu7KNKWRJZOHSjSm$ZhAgy2Ad10iFRi1583bmo7TZavGdioWx6+z2sPWr5zo=', 'owner');

INSERT INTO tariffs (name, price, duration_minutes, zone, tariff_type) VALUES
  ('1 час', 100, 60, 'Стандарт', 'обычный'),
  ('2 часа', 180, 120, 'Стандарт', 'обычный'),
  ('3 часа', 250, 180, 'Стандарт', 'обычный'),
  ('Ночной', 500, 480, 'Стандарт', 'пакет'),
  ('Пакет 5ч', 400, 300, 'Стандарт', 'пакет');

INSERT INTO products (name, category, price, stock, image_url) VALUES
  ('Adrenaline Rush 0.45L', 'Напитки', 150, 45, ''),
  ('Snickers Super', 'Снеки', 85, 12, ''),
  ('Lay''s Краб 140г', 'Снеки', 180, 85, ''),
  ('Коврик SteelSeries Qck', 'Железо', 1500, 5, ''),
  ('Cyber Coffee XXL', 'Горячее', 120, 150, ''),
  ('Вафельный батончик', 'Снеки', 45, 30, '');

INSERT INTO promo_codes (code, promo_type, value, max_usage, expires_at) VALUES
  ('CYBER2024', 'discount', '20%', 100, '2026-12-31'),
  ('NIGHT_OWL', 'fixed', '500', 100, '2026-12-31'),
  ('START2026', 'bonus', '200', 50, '2026-06-01');

INSERT INTO settings (setting_key, setting_value) VALUES
  ('accent_color', '#00FF00'),
  ('font_family', 'JetBrains Mono'),
  ('font_size', '12'),
  ('dark_mode', 'true'),
  ('auto_logout_minutes', '30'),
  ('language', 'ru'),
  ('price_per_minute', '2'),
  ('admin_ip', '192.168.0.100');

-- Генерация 40 ПК
INSERT INTO workstations (pc_number, zone_id, ip_address, status, grid_position, cpu, gpu, ram)
SELECT
  n,
  IF(n <= 10, 1, 2),
  CONCAT('192.168.0.', 100 + n),
  'free',
  n - 1,
  'AMD Ryzen 7 5800H',
  'Nvidia RTX 3070',
  '32GB'
FROM (
  SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
  UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
  UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
  UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25
  UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
  UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35
  UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40
) nums;