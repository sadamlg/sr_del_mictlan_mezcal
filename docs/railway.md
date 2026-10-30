# Railway: de imágenes de producción a staging

Sigue esta guía después de probar Compose y Stripe local, preparar medios públicos no productivos y verificar el dominio de envío en Resend. [Stripe](stripe.md), [Resend](resend.md), [Medios](media.md) y [Dominio/DNS](domain-neubox-cpanel.md) contienen los pasos propios de cada proveedor. Railway ejecuta frontend, API, worker y PostgreSQL como servicios separados.

## Por qué hay Dockerfiles de producción

Los Dockerfiles sin sufijo y `compose.yaml` están hechos para observar cambios y ejecutar `next dev`/Node en desarrollo. `frontend/Dockerfile.production` instala dependencias, ejecuta `npm run build` y arranca `next start`; `backend/Dockerfile.production` genera Prisma Client y arranca la API. El worker reutiliza la imagen del backend con otro comando. Preparar esas imágenes es un requisito **anterior** al primer despliegue, no un ajuste improvisado durante staging. [Dockerfiles en Railway](https://docs.railway.com/builds/dockerfiles/).

Railway puede importar servicios desde Compose, pero este Compose incluye puertos y montajes de desarrollo. Configura explícitamente los cuatro servicios y revisa sus valores. No despliegues Mailpit en Railway.

## Separar entornos

Crea `Staging` y `Production` con PostgreSQL y variables independientes. Usa una rama integrada para staging (`develop`) y prepara producción desde `main` cuando se autorice. Cada entorno requiere su propio dominio público de frontend y API, claves Stripe, secreto de webhook, remitentes y medios. La configuración real de Railway vive en su panel; esta tabla es la receta, no una copia de secretos.

| Servicio | Código y red | Construcción / inicio |
|---|---|---|
| `postgres` | PostgreSQL de Railway, sin dominio público | Base y volumen del entorno; activa y verifica sus respaldos por separado. |
| `api` | `/backend`, dominio público y red privada | `Dockerfile.production`; `node src/server.js`; healthcheck `/health`; pre-deploy `npm run prisma:migrate:deploy`. |
| `worker` | `/backend`, sólo red privada | `Dockerfile.production`; `node src/worker.js`; sin pre-deploy. |
| `frontend` | `/frontend`, dominio público | `Dockerfile.production`; arranque de la imagen (`npm run start`). |

En cada servicio selecciona el repositorio, configura **Root Directory** y **Dockerfile Path** `Dockerfile.production` relativo a esa raíz. La migración se ejecuta una vez desde `api`; el worker no compite por aplicarla. Railway ejecuta el comando pre-deploy entre build y despliegue y detiene el despliegue si falla. [Pre-deploy](https://docs.railway.com/deployments/pre-deploy-command).

## Variables de la API

| Variable | Valor de staging | Razón |
|---|---|---|
| `NODE_ENV` | `production` | Ejecuta el modo desplegado. |
| `PORT` | Puerto asignado por Railway | La API escucha ese puerto; anota su valor al formar la URL privada. |
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` | Base de este entorno. |
| `FRONTEND_ORIGIN` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` | Origen permitido para escrituras. |
| `MEDIA_BASE_URL` | Origen HTTPS público no productivo | URLs del catálogo. |
| `STRIPE_MEDIA_BASE_URL` | El mismo origen público de medios | Imágenes accesibles para Stripe. |
| `STRIPE_SECRET_KEY` | `sk_test_…` | Crear Checkout Sessions de prueba. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` del endpoint de staging | Verificar eventos publicados. |

La API necesita dominio público para el navegador y Stripe; PostgreSQL no. Tras desplegar, abre `https://<dominio-api>/health` y comprueba que las migraciones terminaron antes de continuar.

## Variables del worker

| Variable | Valor de staging |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` |
| `APP_BASE_URL` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `RESEND_API_KEY` | Clave de envío del entorno. |
| `MAIL_FROM` | Dirección de cuentas en un dominio verificado. |
| `RESEND_FROM` | Dirección de pedidos en un dominio verificado. |

El worker no necesita dominio público. Sus correos salen por la API HTTPS de Resend; las variables `SMTP_*` y Mailpit pertenecen sólo a Compose. Comprueba en logs que el proceso arranque y procese trabajos cuando existan. Sigue [Resend](resend.md) para verificar entrega y diagnosticar errores.

## Variables del frontend

| Variable | Valor de staging | Momento de uso |
|---|---|---|
| `NODE_ENV` | `production` | Arranque. |
| `INTERNAL_API_URL` | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` | Solicitudes del servidor y proxy a la API por red privada. |
| `NEXT_PUBLIC_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}` | Fallback para builds que no usen el proxy de producción. |
| `MEDIA_BASE_URL` | Origen HTTPS público no productivo | Build de Next.js y renderizado de imágenes. |

El Dockerfile de producción configura `/api/backend/*` como proxy de llamadas del navegador. Así las cookies de sesión permanecen bajo el dominio del frontend; el proxy reenvía `Origin`, la cookie HttpOnly y `X-Real-IP` a la API. Las cookies bajo HTTPS usan `Secure` y `SameSite=Lax`. Si la API escucha en otro puerto, corrige `INTERNAL_API_URL` con el puerto real: un frontend que carga la landing pero no el catálogo suele indicar una URL privada equivocada. Si cambia `MEDIA_BASE_URL` o una variable pública de build, reconstruye y despliega el frontend.

## Poner en marcha staging

1. Despliega PostgreSQL y `api`; confirma migraciones y `/health`. Luego inicia `worker` y `frontend`.
2. Carga un catálogo de prueba en la base **aislada** de staging. `backend/prisma/dev-showcase.sql` contiene tres fichas y precios provisionales. Con Railway CLI y `psql` instalados, ejecuta `railway login`, vincula el proyecto con `railway link` y abre `railway connect postgres --environment Staging`. En el prompt de `psql`, desde la raíz del repositorio, ejecuta `\i backend/prisma/dev-showcase.sql`. Railway CLI puede abrir un túnel SSH sin publicar PostgreSQL. Nunca cargues ese SQL en producción. Confirma `GET /api/catalog/products`. [Railway connect](https://docs.railway.com/cli/connect).
3. Configura el webhook de Stripe de staging siguiendo [Stripe](stripe.md). Usa su propio `whsec_…`, no el secreto de la CLI local.
4. Comprueba marca e imágenes, registro y confirmación de cuenta, inicio de sesión en otro dispositivo, recuperación de contraseña, carrito, compra aceptada y cancelada, limpieza del carrito, pedido, correo y PDF. Compara el resultado con Stripe, Resend y los logs del worker.
5. Revisa cambios pendientes en Railway antes de desplegarlos. Una modificación de variables puede exigir reconstruir la imagen del frontend.

El dominio público de Railway permite probar staging sin cambiar todavía los *nameservers* del dominio comercial. [Dominios y red privada](https://docs.railway.com/networking/domains/working-with-domains).

## Respaldos antes de abrir producción

En el servicio PostgreSQL, abre **Backups** y activa una programación acorde con la pérdida de datos que puedas tolerar. Un respaldo de volumen se restaura dentro del mismo proyecto y entorno; para comprobar recuperación sin sustituir la base en uso, crea también un volcado lógico y restáuralo en una base de prueba. Deja anotados fecha, tamaño y resultado de la restauración. Railway explica los [respaldos de volumen](https://docs.railway.com/volumes/backups) y un [simulacro de respaldo y restauración de PostgreSQL](https://docs.railway.com/guides/postgres-backups-restores).

## Paso a producción

Producción tiene base y copias de seguridad propias, catálogo con precios aprobados, bucket y hostname de medios propios, remitentes verificados y claves `sk_live_…` con un webhook y `whsec_…` exclusivos. Comprueba TLS, restauración de base, logs, salud y procedimiento para volver a una versión compatible antes de abrir el tráfico o hacer una compra real.

Para volver a una versión de aplicación, redepliega una imagen anterior compatible con el esquema actual. No reviertas una migración destructiva ni restaures una base sin evaluar los datos escritos desde entonces. El [roadmap](ROADMAP.md) separa esta autorización de la aceptación de staging.
