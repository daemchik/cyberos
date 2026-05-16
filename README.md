# cyberos (Django + React + MySQL)

## Структура
- `config/` — Django project (settings/urls)
- `api/` — DRF API (endpoints: `/api/health/`, `/api/items/`)
- `cyberos/` — React + Vite frontend

## Backend (Django)
### Требования
- Python 3.11+
- Установить зависимости (один раз):
```bash
pip install django djangorestframework mysqlclient django-cors-headers djangorestframework-simplejwt
```

### Запуск (dev)
По умолчанию проект стартует на **SQLite**, чтобы не упираться в MySQL доступы.

```bash
python manage.py migrate
python manage.py runserver 8000
```

### MySQL (включён по умолчанию)
MySQL включён по умолчанию в `config/settings.py` (`MYSQL_USE=true`).

Если MySQL не доступен/не настроен, Django упадёт на старте. Чтобы использовать SQLite, задайте:
- `MYSQL_USE=false`
- `MYSQL_DB_NAME` (default: `cyberos`)
- `MYSQL_DB_USER` (default: `root`)
- `MYSQL_DB_PASSWORD` (нужен! иначе будет `using password: NO`)
- `MYSQL_DB_HOST` (default: `localhost`)
- `MYSQL_DB_PORT` (default: `3306`)

После этого:
```bash
python manage.py migrate
python manage.py runserver 8000
```

## Frontend (React + Vite)
Проект frontend находится тут: `cyberos/`.

### Установка и запуск
```bash
cd cyberos
npm install
npm run dev
```

Frontend по умолчанию проксирует запросы на backend:
- `/api/*` → `http://localhost:8000`

URL:
- http://localhost:5173/

## API
- `GET /api/health/` → `{ status, service }`
- `GET /api/items/` → список items (DRF pagination формат)
- `POST /api/items/` → создать item: `{ "name": "..." }`

## Тестовый чек (быстрый)
1) Backend:
- `http://127.0.0.1:8000/api/health/`

2) Frontend:
- откройте `http://localhost:5173/`
- проверьте, что в UI отображаются health и items
