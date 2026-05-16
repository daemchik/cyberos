#!/usr/bin/env bash
# Пример бэкапа MySQL из контейнера docker-compose (сервис db).
set -euo pipefail
OUT="${1:-./backups/cyberos-$(date +%Y%m%d-%H%M).sql.gz}"
mkdir -p "$(dirname "$OUT")"
docker compose exec -T db mysqldump -uroot -p"${MYSQL_ROOT_PASSWORD:-cyberos_root}" cyberos | gzip > "$OUT"
echo "Written: $OUT"
