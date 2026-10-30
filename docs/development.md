# Desarrollo local con Docker Compose

Esta es la ruta de entrada reproducible. `compose.yaml`, `.env.example` y los Dockerfiles de desarrollo definen servicios y valores; esta guía explica cómo usarlos. No hace falta una cuenta de Railway, Resend ni Cloudflare para levantar la tienda local.

## Arranque desde un clon limpio

Necesitas Git, Docker Engine y Docker Compose v2. Los puertos iniciales son 3000 (tienda), 4000 (API), 5432 (PostgreSQL) y 8025 (Mailpit).

```bash
cp .env.example .env
docker compose config --quiet
docker compose up --build --detach --wait --wait-timeout 180
docker compose exec backend npm run prisma:migrate:deploy
docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/prisma/dev-showcase.sql
```

El último comando carga tres productos de demostración con precios provisionales. Úsalo sólo en una base local vacía; no es una migración y no debe utilizarse como catálogo comercial. Compose no aplica migraciones ni carga productos automáticamente.

| Servicio | Dirección | Resultado esperado |
|---|---|---|
| Tienda | http://localhost:3000 | Landing y colección con tres productos tras cargar el SQL. |
| API | http://localhost:4000/health | Respuesta saludable. |
| Mailpit | http://localhost:8025 | Bandeja de correos de desarrollo. |
| PostgreSQL | localhost:5432 | Base local; no se publica en la LAN por defecto. |

El frontend usa `http://backend:3000` para consultar la API desde Compose. Esa dirección interna no se abre en el navegador. Por defecto, las imágenes salen del frontend local mediante `MEDIA_BASE_URL=http://localhost:3000`; el worker entrega a Mailpit los correos de cuenta y de compra, incluido el PDF. Para probar pagos, sigue la [guía de Stripe](stripe.md): la Stripe CLI se ejecuta fuera de Compose y reenvía los webhooks al puerto público de la API.

## Escenarios opcionales

Empieza siempre por el perfil local anterior. Cambia sólo las variables de la variante que necesites y recrea los servicios afectados.

### Dos proyectos Compose en el mismo equipo

En el `.env` del segundo proyecto usa un nombre y puertos de anfitrión distintos:

```dotenv
COMPOSE_PROJECT_NAME=otro-proyecto
FRONTEND_PORT=3001
BACKEND_PORT=4001
POSTGRES_PORT=5433
MAILPIT_PORT=8026
NEXT_PUBLIC_API_URL=http://localhost:4001
FRONTEND_ORIGIN=http://localhost:3001
APP_BASE_URL=http://localhost:3001
MEDIA_BASE_URL=http://localhost:3001
```

`INTERNAL_API_URL=http://backend:3000`, `SMTP_HOST=mailpit` y los puertos internos de los contenedores permanecen igual. Si pruebas Stripe en ese proyecto, el `--forward-to` de la CLI debe usar `localhost:4001`. El nombre de proyecto separa redes y volúmenes; los puertos separan los accesos desde el anfitrión.

### Acceso desde un teléfono en la misma LAN

Sustituye la IP de ejemplo por la dirección LAN de tu equipo y conserva los puertos reales de ese proyecto:

```dotenv
FRONTEND_BIND_ADDRESS=0.0.0.0
BACKEND_BIND_ADDRESS=0.0.0.0
NEXT_ALLOWED_DEV_ORIGIN=192.168.1.20
NEXT_PUBLIC_API_URL=http://192.168.1.20:4000
FRONTEND_ORIGIN=http://192.168.1.20:3000
APP_BASE_URL=http://192.168.1.20:3000
MEDIA_BASE_URL=http://192.168.1.20:3000
```

Mantén PostgreSQL y Mailpit ligados a `127.0.0.1` salvo que necesites acceder a ellos desde otro equipo. Conserva `INTERNAL_API_URL=http://backend:3000`. Abre la tienda usando la misma IP y el mismo origen que configuraste; mezclar `localhost` y la IP LAN separa sesiones y URLs para el navegador.

### Medios desde R2 en desarrollo

Configura `MEDIA_BASE_URL` con el origen HTTPS público no productivo de R2. Si quieres imágenes en Stripe Checkout, asigna ese mismo origen a `STRIPE_MEDIA_BASE_URL`: Stripe no puede descargar una imagen alojada sólo en tu `localhost` o LAN. Consulta [medios y R2](media.md) para las claves, la carga manual y la separación de entornos.

## Aplicar cambios y diagnosticar

```bash
docker compose ps
docker compose logs --follow backend worker
docker compose up --detach --force-recreate frontend backend worker
docker compose up --build --detach --force-recreate frontend backend worker
```

`restart` reinicia procesos existentes. `--force-recreate` aplica variables o cambios de Compose; añade `--build` si cambian Dockerfiles, dependencias o configuración que Next.js incorpora al construir. `docker compose down` conserva el volumen de PostgreSQL; `docker compose down -v` lo elimina junto con los datos locales.

Si un servicio no inicia, revisa primero puertos ocupados y `docker compose logs`. Si la colección está vacía, comprueba migraciones, SQL de demostración y `GET /api/catalog/products`. Si faltan imágenes, compara `MEDIA_BASE_URL` con el origen al que llega el navegador. Si el pago vuelve a la tienda sin confirmar la orden, verifica que la Stripe CLI sigue activa y que `STRIPE_WEBHOOK_SECRET` coincide con su listener. Si no aparece correo, consulta los logs del worker y Mailpit.

Para crear una migración nueva después de cambiar el esquema: `docker compose exec backend npm run prisma:migrate:dev -- --name nombre_del_cambio`. Versiona `backend/prisma/migrations/` con el código. No borres la base para solucionar una migración sin revisar sus datos.

## Verificaciones disponibles

```bash
docker compose exec backend npm test
docker compose exec backend npm run test:db
docker compose exec frontend npm test
docker compose run --rm frontend-e2e
docker compose exec backend npm run lint
docker compose exec frontend npm run lint
```

`frontend-e2e` usa el perfil `e2e`; se ejecuta sólo cuando se solicita. Las pruebas unitarias frontend están en `frontend/tests/` y los recorridos Playwright en `frontend/e2e/`.
