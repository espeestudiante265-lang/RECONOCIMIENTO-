
# Despliegue con Docker (Backend Django + Frontend Next.js + MySQL)

## Estructura
Coloca la carpeta `proyecto DSS1` y `proyecto_dss1_deploy/` al mismo nivel:

```
/carpeta
├── proyecto DSS1/            # Tu proyecto (backend/ y frontend/)
└── proyecto_dss1_deploy/
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    ├── docker-compose.yml
    ├── entrypoint.sh
    └── .env.example
```

## Pasos
1. Copia `.env.example` a `.env` y edita valores si lo necesitas.
2. Abre una terminal en `proyecto_dss1_deploy/`.
3. Construye y levanta todo:
   ```bash
   docker compose up -d --build
   ```
4. Servicios:
   - MySQL: `localhost:3306`
   - Backend (Django/Gunicorn): `http://localhost:8000`
   - Frontend (Next.js): `http://localhost:3000`

## Poblado de la base (opcional)
Si tienes `monitoreo_db.sql`, puedes importarlo al contenedor MySQL:
```bash
docker cp "../proyecto DSS1/monitoreo_db.sql" dss1-mysql:/monitoreo_db.sql
docker exec -it dss1-mysql bash -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /monitoreo_db.sql'
```

## Usuarios y migraciones
- Las migraciones corren automáticamente al iniciar el backend.
- Para crear un superusuario:
  ```bash
  docker exec -it dss1-backend python backend/manage.py createsuperuser
  ```

## Variables importantes
- `NEXT_PUBLIC_API_BASE` controla a qué URL llama el **frontend**. En local suele ser `http://localhost:8000`. En producción, cámbialo a tu dominio del backend (ej. `https://api.midominio.com`).
- El backend usa `backend.settings_docker` que hereda de tus `settings.py` y solo cambia DB/CORS/ALLOWED_HOSTS.

## Logs
```bash
docker compose logs -f db
docker compose logs -f backend
docker compose logs -f frontend
```

## Apagar
```bash
docker compose down
```
