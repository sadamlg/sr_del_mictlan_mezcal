# Despliegue en Railway: staging y producción

Esta guía prepara el repositorio para publicar la aplicación en Railway. Todavía hacen falta una cuenta de Railway, dominios, secretos y remitentes de correo. No hay credenciales ni dominios de esos entornos guardados en el repositorio.

## Servicios

Railway puede importar servicios compatibles desde un archivo Compose, pero no todas las opciones de Compose tienen equivalente en la plataforma. Para este proyecto configura y revisa estos servicios en el lienzo de Railway; no copies los puertos publicados ni los bind mounts de desarrollo.

| Servicio Railway | Código / recurso | Exposición | Dockerfile |
|---|---|---|---|
| `postgres` | PostgreSQL administrado de Railway | Sólo red privada | Proveedor administrado |
| `api` | `backend/` | Dominio público para el navegador y Stripe; red privada para los demás servicios | `backend/Dockerfile.production` |
| `worker` | `backend/` | Sólo red privada | `backend/Dockerfile.production` |
| `frontend` | `frontend/` | Dominio público | `frontend/Dockerfile.production` |

`worker` usa la misma imagen que `api`, con un comando de inicio distinto. No despliegues Mailpit en Railway: es sólo para desarrollo local. Railway permite importar servicios de Compose, aunque el soporte de sus opciones es parcial; aquí se configura explícitamente cada servicio para revisar su imagen, red y variables.

## 1. Mantener los entornos aislados

1. Crea un proyecto Railway y dos entornos: `Staging` y `Production`.
2. Añade PostgreSQL en cada entorno. Conserva una base distinta por entorno y no copies datos reales a staging.
3. Crea `api`, `worker` y `frontend` desde el mismo repositorio y la rama correspondiente.
4. Asigna un dominio público a `api` y `frontend` en cada entorno. Usa el dominio de staging para probar; conecta dominios propios y DNS sólo al preparar producción.
5. Configura las variables de cada entorno por separado. Staging debe usar claves Stripe de prueba, medios no productivos y credenciales de correo de prueba.

Railway mantiene variables y recursos separados por entorno. Revisa cualquier cambio en la vista de cambios pendientes antes de desplegar.

## 2. Configurar API

En el servicio `api`, selecciona el repositorio y configura:

- **Root Directory:** `/backend`
- **Dockerfile Path:** `Dockerfile.production` (variable de servicio `RAILWAY_DOCKERFILE_PATH`)
- **Start Command:** `node src/server.js`
- **Healthcheck Path:** `/health`
- **Pre-deploy Command:** `npm run prisma:migrate:deploy`
- **Dominio público:** sí; Stripe y el navegador necesitan alcanzar la API.

El pre-deploy ejecuta las migraciones existentes antes de arrancar la API. El Dockerfile instala Prisma CLI para que ese comando esté disponible. No pongas la migración también en `worker`: se ejecuta una vez en `api` para evitar que ambos procesos compitan al iniciar.

Configura las siguientes variables en el servicio `api` de cada entorno:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Déjala a Railway; la aplicación escucha el puerto inyectado. |
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` |
| `FRONTEND_ORIGIN` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `MEDIA_BASE_URL` | URL HTTPS pública del bucket correspondiente al entorno. |
| `STRIPE_MEDIA_BASE_URL` | La misma URL HTTPS de medios para que Stripe descargue las imágenes del checkout. |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe del entorno. En staging usa `sk_test_…`. |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma `whsec_…` del endpoint de ese entorno. |

## 3. Configurar worker

En el servicio `worker`, selecciona el mismo repositorio y configura:

- **Root Directory:** `/backend`
- **Dockerfile Path:** `Dockerfile.production`
- **Start Command:** `node src/worker.js`
- **Dominio público:** no.
- **Pre-deploy Command:** ninguno.

Variables necesarias:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` |
| `APP_BASE_URL` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `RESEND_API_KEY` | Clave Resend del entorno. |
| `RESEND_FROM` | Remitente en un dominio verificado en Resend, por ejemplo `Señor del Mictlán <pedidos@dominio-verificado>`. |
| `MAIL_FROM` | Remitente autorizado por Resend para mensajes de cuenta, por ejemplo `Señor del Mictlán <cuentas@dominio-verificado>`. |

En Railway, el código envía por la API HTTPS de Resend los correos de compra y los de cuenta (registro, confirmación y recuperación de contraseña). Así funciona también en los planes de Railway que bloquean conexiones SMTP salientes. Mailpit y SMTP sólo se usan en Compose para desarrollo local; no configures variables `SMTP_*` en Railway.

## 4. Configurar frontend

En `frontend`, selecciona el mismo repositorio y configura:

- **Root Directory:** `/frontend`
- **Dockerfile Path:** `Dockerfile.production`
- **Dominio público:** sí.

Variables:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `INTERNAL_API_URL` | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` |
| `NEXT_PUBLIC_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}` |
| `MEDIA_BASE_URL` | URL HTTPS pública del bucket de medios de ese entorno. |

`INTERNAL_API_URL` se usa en solicitudes del servidor Next.js y debe apuntar a la red privada de Railway. `NEXT_PUBLIC_API_URL` se incluye en el JavaScript que recibe el navegador; el Dockerfile la declara como argumento de build. `MEDIA_BASE_URL` también participa en la configuración de imágenes de Next.js durante el build. Si cambias cualquiera de estas dos variables, vuelve a construir y desplegar el frontend.

Como los dominios públicos de Frontend y API son distintos, las cookies de sesión de producción se envían con `SameSite=None; Secure`. El cliente debe conservar `credentials: 'include'` y la API debe permitir exactamente el origen del Frontend mediante `FRONTEND_ORIGIN`.

Staging puede seguir usando el bucket no productivo documentado en [Cloudflare R2](../cloudflare/r2.md). Antes de producción configura un bucket y hostname separados, y reemplaza ambas URL de medios.

## 5. Configurar Stripe y validar staging

1. En Stripe, usa credenciales de prueba y crea un webhook que apunte a `https://<dominio-publico-api>/api/webhooks/stripe`.
2. Suscribe el webhook a los eventos que ya maneja la aplicación y copia su secreto `whsec_…` a `STRIPE_WEBHOOK_SECRET` de staging. No ejecutes `stripe listen` para un webhook ya publicado en Railway; Stripe llega directamente al dominio HTTPS.
3. Despliega primero API y worker, confirma `/health` y que las migraciones terminaron. Después despliega frontend.
4. Carga en staging el catálogo y las imágenes no productivas. No uses `backend/prisma/dev-showcase.sql` como catálogo real.
5. Prueba registro, confirmación de cuenta, recuperación de contraseña, inicio de sesión, imágenes del catálogo y carrito, compra aceptada, compra cancelada, webhook, limpieza del carrito, orden y PDF, entrega/reintento del worker y logs de errores.
6. Revisa los correos de cuenta y la confirmación de compra en Resend.
7. Antes de dar por cerrada la fase 08, implementa y valida Turnstile: aún no está en el código. La integración debe validar el token en servidor con Cloudflare Siteverify.

## 6. Promover a producción

Promueve sólo después de aceptar staging y preparar estos elementos en el entorno `Production`:

- PostgreSQL independiente, migraciones revisadas y copias de seguridad/restauración comprobadas.
- Dominios definitivos con TLS, `FRONTEND_ORIGIN`, URLs de API y URLs de medios de producción correctas.
- Claves Stripe de producción y webhook de producción con su propio secreto.
- Dominio remitente verificado y credenciales de Resend/SMTP para los dos tipos de correo.
- Catálogo real y medios de producción, sin el SQL de demostración.
- Revisión de logs de API y worker, estado de `/health` y procedimiento para volver al despliegue anterior.

Haz un primer pago real sólo después de autorizar explícitamente la salida a producción. Para deshacer una versión de aplicación, vuelve al despliegue anterior de API/frontend/worker compatible con el esquema actual. No reviertas una migración destructiva ni restaures una base sin revisar el impacto de datos.

## Referencias

- [Dockerfiles y argumentos de build en Railway](https://docs.railway.com/builds/dockerfiles)
- [Red privada y dominios públicos/privados](https://docs.railway.com/networking/domains/working-with-domains)
- [Comandos pre-deploy](https://docs.railway.com/deployments/pre-deploy-command)
- [Importar servicios Docker Compose en Railway](https://docs.railway.com/guides/docker-compose)
- [Webhooks firmados de Stripe](https://docs.stripe.com/webhooks)
- [Validación server-side de Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
