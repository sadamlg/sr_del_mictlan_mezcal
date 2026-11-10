# Despliegue en Railway: staging y producción

Esta guía permite configurar la aplicación en Railway desde cero. El responsable confirmó una compra de prueba en staging el 29 de octubre de 2026; quien prepare un entorno nuevo necesita su propia cuenta, dominios, secretos y remitentes. Las credenciales y los valores efectivos de esos entornos no se guardan en el repositorio.

Antes de configurar staging, completa el [entorno local](../docker/COMPOSE.md), prueba [Stripe en local](STRIPE.md), prepara [medios no productivos](R2.md) y verifica el dominio y remitentes según las guías de [Neubox y cPanel](NEUBOX.md) y [Resend](RESEND.md). No necesitas cambiar los *nameservers* del dominio para usar los dominios públicos de Railway en staging.

## Por qué existen Dockerfiles de producción

Los Dockerfiles normales y Compose ejecutan servidores de desarrollo con observación de cambios. `frontend/Dockerfile.production` construye Next.js con `npm run build` y arranca `next start`; `backend/Dockerfile.production` genera Prisma Client y arranca la API. El worker comparte la imagen del backend, pero usa `node src/worker.js` como comando de inicio. Estos archivos deben estar en el repositorio antes de crear los servicios Railway. [Dockerfiles de Railway](https://docs.railway.com/builds/dockerfiles).

## Servicios

Railway puede importar servicios compatibles desde un archivo Compose, pero no todas las opciones de Compose tienen equivalente en la plataforma. Para este proyecto configura y revisa estos servicios en el lienzo de Railway; no copies los puertos publicados ni los bind mounts de desarrollo.

| Servicio Railway | Código / recurso | Exposición | Dockerfile |
|---|---|---|---|
| `postgres` | PostgreSQL de Railway con volumen | Sólo red privada | Plantilla PostgreSQL; respaldos se configuran por separado |
| `api` | `backend/` | Dominio público para Stripe y red privada para los demás servicios; el frontend de producción usa su proxy | `backend/Dockerfile.production` |
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
- **Dominio público:** sí; Stripe necesita alcanzar el webhook. En el Dockerfile de producción, las peticiones del navegador pasan por el proxy del frontend hacia la API privada.

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
| `NEXT_PUBLIC_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}` (fallback para llamadas directas fuera del Dockerfile de producción) |
| `MEDIA_BASE_URL` | URL HTTPS pública del bucket de medios de ese entorno. |

`INTERNAL_API_URL` se usa en solicitudes del servidor Next.js y en el proxy `/api/backend/*`; debe apuntar a la red privada de Railway. El Dockerfile de producción envía las llamadas del navegador por ese proxy, bajo el mismo dominio del frontend. Así las cookies de sesión son propias del frontend y no dependen de cookies entre dominios. `NEXT_PUBLIC_API_URL` queda como fallback para entornos que no usan el Dockerfile de producción. `MEDIA_BASE_URL` participa en la configuración de imágenes durante el build. Si cambias estas variables, vuelve a construir y desplegar el frontend.

Las cookies de sesión de producción usan `SameSite=Lax; Secure`. El proxy conserva `Origin` para que la API siga validando `FRONTEND_ORIGIN`, reenvía la cookie HttpOnly y conserva `X-Real-IP` para que el rate limit siga distinguiendo a cada cliente.

Staging puede seguir usando el bucket no productivo documentado en [Cloudflare R2](R2.md). Antes de producción configura un bucket y hostname separados, y reemplaza ambas URL de medios.

## 5. Configurar Stripe y validar staging

1. En Stripe, usa credenciales de prueba y crea un webhook que apunte a `https://<dominio-publico-api>/api/webhooks/stripe`.
2. Suscribe el webhook a los cuatro eventos manejados por la aplicación y copia su secreto `whsec_…` a `STRIPE_WEBHOOK_SECRET` de staging. La [guía de Stripe](STRIPE.md) detalla la selección del destino, eventos y diferencia entre los secretos. No ejecutes `stripe listen` para un webhook ya publicado en Railway; Stripe llega directamente al dominio HTTPS.
3. Despliega primero API y worker, confirma `/health` y que las migraciones terminaron. Después despliega frontend.
4. Carga en staging el catálogo y las imágenes no productivas con los importes actuales del MVP. El SQL incluido abajo es para pruebas en una base de staging aislada; no es un seed de producción.
5. Prueba registro, confirmación de cuenta, recuperación de contraseña, inicio de sesión, imágenes del catálogo y carrito, compra aceptada, compra cancelada, webhook, limpieza del carrito, orden y PDF, entrega/reintento del worker y logs de errores.
6. Revisa los correos de cuenta y la confirmación de compra en Resend. La [guía de Resend](RESEND.md) explica la clave, remitentes y diagnóstico del worker.
7. Antes de dar por cerrada la fase 08, implementa y valida Turnstile: aún no está en el código. La integración debe validar el token en servidor con Cloudflare Siteverify.

### Ejemplo reproducible de catálogo para staging

Este ejemplo crea en **staging aislado** las tres fichas y los importes vigentes del alcance MVP, después de aplicar migraciones y con Stripe en modo de prueba. Son los precios correctos para validar el MVP; el cliente debe aprobar los precios comerciales finales antes de vender en producción. El archivo <code>backend/prisma/dev-showcase.sql</code> sigue siendo exclusivo de una base local vacía; este bloque de staging es independiente y no debe ejecutarse en producción.

1. Instala Railway CLI y `psql`; ejecuta `railway login` y `railway link` desde la raíz del proyecto, y selecciona el proyecto correcto. Conecta la base del entorno de prueba con `railway connect postgres --environment Staging` (sustituye `postgres` y `Staging` si tus nombres son distintos). La [CLI de Railway](https://docs.railway.com/cli/connect) puede usar un túnel SSH cuando la base no tiene proxy público.
2. Antes de ejecutar el bloque, confirma en Railway que la conexión corresponde a **Staging**, que Stripe usa claves de prueba y que las imágenes están cargadas en el bucket no productivo con las claves del [inventario R2](R2.md). En el prompt de `psql`, pega:

```sql
INSERT INTO products (
  id, slug, name, description, price_cents, image_key, image_alt,
  lifestyle_image_key, label_one, label_two, sensory_profile,
  alcohol_min_percent, alcohol_max_percent, volume_ml, position, active, updated_at
) VALUES
  (
    gen_random_uuid(), 'calios', 'Calios · Destilado de pulque',
    'Un destilado de pulque de perfil frutal y terroso.', 25000,
    'images/catalog/calios-product.png', 'Botella de Calios, destilado de pulque',
    'images/catalog/calios-lifestyle.png', 'Pulque fermentado', 'Frutal y terroso',
    'Notas frutales y dulces únicas, con un retrogusto terroso que evoca las antiguas haciendas pulqueras.',
    36, 42, 750, 1, true, now()
  ),
  (
    gen_random_uuid(), 'mezcal-joven', 'Mezcal joven · Una destilación',
    'Elaborado con cupreata silvestre, de notas herbales y ahumadas.', 35000,
    'images/catalog/mezcal-joven-product.png', 'Botella de mezcal joven Señor del Mictlán',
    'images/catalog/mezcal-joven-lifestyle.png', 'Cupreata silvestre', 'Herbal y ahumado',
    'Aromas frescos a hierba y tierra húmeda. Entrada potente en boca con un ahumado auténtico y persistente.',
    45, 45, 750, 2, true, now()
  ),
  (
    gen_random_uuid(), 'mezcal-doble-destilacion', 'Mezcal reposado · Doble destilación',
    'Elaborado con cupreata silvestre, con notas de quiote y madera.', 50000,
    'images/catalog/mezcal-reposado-product.png', 'Botella de mezcal de doble destilación Señor del Mictlán',
    'images/catalog/mezcal-reposado-lifestyle.png', 'Cupreata silvestre', 'Quiote y madera',
    'Notas dulces de quiote y madera con un final ahumado elegante. Cuerpo robusto y matices dorados brillantes.',
    40, 40, 750, 3, true, now()
  )
ON CONFLICT (slug) DO NOTHING;
```

3. Sal de `psql` con `\q` y abre `https://<dominio-publico-api>/api/catalog/products`: deben aparecer las fichas activas. `ON CONFLICT (slug) DO NOTHING` evita reemplazar fichas existentes; si ya existen, revisa sus valores en lugar de asumir que este bloque los actualizó.

### Diagnóstico de problemas observados

| Síntoma | Qué revisar |
|---|---|
| La landing abre pero la colección no | Comprueba que `GET /api/catalog/products` devuelva fichas, que las migraciones y datos de staging estén cargados y que `INTERNAL_API_URL` apunte a la API privada y al puerto donde realmente escucha. |
| No aparece la marca o faltan imágenes | Revisa las claves en R2 y `MEDIA_BASE_URL` en API y frontend; el frontend debe reconstruirse si cambió la variable usada en build. |
| La contraseña es aceptada pero la sesión no se conserva | Revisa que el frontend use `Dockerfile.production`, el proxy `/api/backend/*`, `INTERNAL_API_URL`, `FRONTEND_ORIGIN` y HTTPS. Prueba también desde el teléfono. |
| La compra se pagó pero no llegó el correo | Comprueba la entrega del webhook, el trabajo de correo y los logs del worker. Un fallo al generar el PDF o un rechazo de Resend impide el envío aunque Stripe haya confirmado el pago. |
| El carrito conserva artículos pagados | Comprueba webhook, sesión y refresco del carrito. Las líneas que cambiaron mientras el Checkout estaba abierto se preservan deliberadamente. |

### Control del consumo del workspace

Railway ofrece límites para el consumo de **cómputo a nivel de workspace**, no un máximo independiente por servicio o entorno:

1. Abre la página **Usage** del workspace y revisa el consumo por proyecto y los límites actuales. También puedes consultar el estado con <code>railway usage limit status</code>.
2. Define primero el presupuesto mensual aprobado para el workspace. Configura la alerta suave para recibir un correo sin interrumpir servicios y un límite duro sólo si aceptas que, al alcanzarlo, Railway apague todos los workloads de ese workspace. Staging y Production comparten el efecto cuando están en el mismo workspace.
3. No copies umbrales de ejemplo ni fijes cifras sin presupuesto aprobado. La configuración se gestiona desde **Workspace Usage**; la CLI puede consultarla y establecer valores aprobados con <code>railway usage limit set --target workspace --soft &lt;dólares&gt; --hard &lt;dólares&gt;</code>. Verifica las reglas de entrada en la [referencia CLI](https://docs.railway.com/cli/usage).
4. Registra en el acta de despliegue quién eligió esos umbrales y el efecto esperado. El repositorio no confirma los valores actuales del workspace.

[Control de costos de Railway](https://docs.railway.com/pricing/cost-control).

## 6. Promover a producción

Promueve sólo después de aceptar staging y preparar estos elementos en el entorno `Production`:

- PostgreSQL independiente, migraciones revisadas y copias de seguridad/restauración comprobadas.
- Dominios definitivos con TLS, `FRONTEND_ORIGIN`, URLs de API y URLs de medios de producción correctas.
- Claves Stripe de producción y webhook de producción con su propio secreto.
- Dominio remitente verificado y clave de Resend para los dos tipos de correo. El worker desplegado usa la API HTTPS de Resend; SMTP/Mailpit es el flujo local.
- Catálogo y medios de producción separados de los datos de staging, con precios comerciales finales aprobados por el cliente. Los importes actuales del MVP son para pruebas y no autorizan ventas reales.
- Revisión de logs de API y worker, estado de `/health` y procedimiento para volver al despliegue anterior.

Haz un primer pago real sólo después de autorizar explícitamente la salida a producción. Para deshacer una versión de aplicación, vuelve al despliegue anterior de API/frontend/worker compatible con el esquema actual. No reviertas una migración destructiva ni restaures una base sin revisar el impacto de datos.

### Respaldos y recuperación

En el servicio PostgreSQL abre **Backups** y configura una programación de acuerdo con la pérdida de datos aceptable. Un respaldo de volumen se restaura en el mismo proyecto y entorno. Para verificar recuperación sin sustituir la base activa, prepara también un volcado lógico y restáuralo en una base de prueba; registra la fecha y el resultado. Consulta las guías de [respaldos de volumen](https://docs.railway.com/volumes/backups) y [respaldo y restauración de PostgreSQL](https://docs.railway.com/guides/postgres-backups-restores).

## Referencias

- [Dockerfiles y argumentos de build en Railway](https://docs.railway.com/builds/dockerfiles)
- [Red privada y dominios públicos/privados](https://docs.railway.com/networking/domains/working-with-domains)
- [Comandos pre-deploy](https://docs.railway.com/deployments/pre-deploy-command)
- [Importar servicios Docker Compose en Railway](https://docs.railway.com/guides/docker-compose)
- [Webhooks firmados de Stripe](https://docs.stripe.com/webhooks)
- [Validación server-side de Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
