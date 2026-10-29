# Entorno local con Docker Compose

Esta guía describe cómo levantar y mantener el sistema actual en local. `compose.yaml`, los Dockerfiles y los manifiestos de paquetes son la fuente de verdad para servicios, puertos y versiones; aquí se documenta el flujo de uso.

## Requisitos

- Git, Docker Engine y Docker Compose v2.
- Puertos locales disponibles: 3000 (frontend), 4000 (API), 5432 (PostgreSQL) y 8025 (Mailpit).

## Inicio y base local

Para instalar `.env` y levantar los servicios, sigue la sección [Clonar y configurar el repositorio](../../README.md#clonar-y-configurar-el-repositorio). El servicio `frontend-e2e` ejecuta Playwright y se inicia aparte, bajo demanda. Compose no aplica migraciones ni carga productos automáticamente; aplica el esquema como se indica en [Cambios de esquema](#cambios-de-esquema). Para poblar una base local vacía con catálogo de demostración:

```bash
docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/prisma/dev-showcase.sql
```

El SQL añade tres productos con precios provisionales. Es sólo para desarrollo local; no lo apliques en staging o producción. En una base con esos `slug`, no actualiza los productos existentes.

| Servicio | Dirección local | Uso |
|---|---|---|
| Frontend | [http://localhost:3000](http://localhost:3000) | Tienda y páginas de cuenta |
| API | [http://localhost:4000/health](http://localhost:4000/health) | Salud y rutas `/api` |
| Mailpit | [http://localhost:8025](http://localhost:8025) | Ver mensajes de cuenta de desarrollo |
| PostgreSQL | `localhost:5432` | Acceso desde herramientas locales |

Next.js consulta la API dentro de Compose por `http://backend:3000`. El navegador usa `http://localhost:4000`; no puede resolver el nombre interno `backend`. Mailpit recibe SMTP en el puerto interno `1025`, que no se publica al anfitrión.

## Correo y pagos

El worker envía los mensajes de cuenta por SMTP a Mailpit en el entorno local. Los mensajes de confirmación de compra y PDF aún no existen; Resend está planeado, pero no conectado.

Stripe Checkout y el webhook están implementados. Para probarlos, configura credenciales de prueba en `.env`; nunca guardes claves reales en Git. Un listener de Stripe CLI debe reenviar los webhooks a `http://localhost:4000/api/webhooks/stripe`; ese proceso no forma parte de Compose. `STRIPE_MEDIA_BASE_URL` permite que Stripe descargue las imágenes públicas de R2; sin ella el checkout funciona sin imagen.

## Cambios de esquema

Al modificar el esquema Prisma, crea una migración en el entorno local:

```bash
docker compose exec backend npm run prisma:migrate:dev -- --name nombre_del_cambio
```

Versiona `backend/prisma/migrations/` con el código. En una copia limpia o entorno que sólo deba aplicar migraciones existentes, usa:

```bash
docker compose exec backend npm run prisma:migrate:deploy
docker compose exec backend npm run prisma:migrate:status
```

No borres el volumen de PostgreSQL para resolver errores de migración sin revisar primero qué datos contiene.

## Comandos de trabajo

```bash
docker compose ps
docker compose logs --follow backend worker
docker compose restart frontend backend
docker compose up --detach --force-recreate frontend backend
docker compose up --build --detach --force-recreate frontend backend
```

Usa `restart` para reiniciar procesos. Usa `--force-recreate` para aplicar cambios de `.env` o Compose; añade `--build` si cambian Dockerfiles, dependencias o configuración copiada a la imagen. Para detener servicios conservando los datos:

```bash
docker compose down
```

`docker compose down -v` también elimina el volumen de PostgreSQL y sus datos locales.

## 9. Acceso opcional desde la red local

Para abrir la tienda desde otro dispositivo de una red confiable, sustituye `192.168.1.20` por la IP local del anfitrión en `.env`:

```dotenv
FRONTEND_BIND_ADDRESS=0.0.0.0
BACKEND_BIND_ADDRESS=0.0.0.0
NEXT_ALLOWED_DEV_ORIGIN=192.168.1.20
NEXT_PUBLIC_API_URL=http://192.168.1.20:4000
FRONTEND_ORIGIN=http://192.168.1.20:3000
APP_BASE_URL=http://192.168.1.20:3000
```

Conserva `INTERNAL_API_URL=http://backend:3000`. Si las imágenes se sirven desde el frontend local, usa `MEDIA_BASE_URL=http://192.168.1.20:3000`; si usas R2, conserva su URL HTTPS. Después recrea los servicios frontend y backend.

## Pruebas y verificaciones disponibles

Ejecuta las pruebas dentro de Compose, con la base preparada cuando la suite lo necesite:

```bash
docker compose exec backend npm test
docker compose exec backend npm run test:db
docker compose exec frontend npm test
docker compose run --rm frontend-e2e
docker compose exec backend npm run lint
docker compose exec frontend npm run lint
```

Las pruebas unitarias del frontend viven en `frontend/tests/`; los recorridos de navegador usan Playwright en `frontend/e2e/`.
