#!/bin/sh
set -e

echo "Waiting for database $DB_HOST:$DB_PORT ..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done
echo "Database is up"

# Trabajamos SIEMPRE dentro del directorio que contiene manage.py y el paquete "backend"
cd /app/backend

# Usamos las settings dockerizadas
export DJANGO_SETTINGS_MODULE=backend.settings_docker

# Migraciones y estáticos
python manage.py migrate --noinput || (echo "Migrate failed" && exit 1)
python manage.py collectstatic --noinput || true

# Arranque:
if [ -f /app/backend/backend/wsgi.py ]; then
  echo "Starting Gunicorn (WSGI)..."
  exec gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
elif [ -f /app/backend/backend/asgi.py ]; then
  echo "Starting Gunicorn (ASGI via UvicornWorker)..."
  exec gunicorn -k uvicorn.workers.UvicornWorker backend.asgi:application --bind 0.0.0.0:8000 --workers 3
else
  echo "No wsgi.py or asgi.py found under /app/backend/backend/"
  ls -la /app/backend/backend || true
  exit 1
fi
