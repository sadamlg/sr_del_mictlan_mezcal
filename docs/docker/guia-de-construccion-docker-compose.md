# Guía maestra de infraestructura y desarrollo con Docker Compose

Esta guía es el mapa de la infraestructura del proyecto y el punto de entrada para operar su entorno local. Define el desarrollo estándar y el acceso desde la red local, y enlaza las instrucciones específicas de R2, Stripe, Resend y Railway. La red bridge de Compose conecta los contenedores en todos los recorridos locales; el acceso LAN sólo cambia cómo el anfitrión publica algunos servicios y las direcciones que usa el navegador.

El desarrollo local estándar usa Mailpit y medios servidos por la aplicación. El acceso LAN conserva esos servicios y permite elegir medios locales o un origen público de R2. R2 no modifica los puertos de Compose. Resend se usa en staging y producción; en Compose, `NODE_ENV=development` mantiene el correo de prueba en Mailpit.

La aplicación guarda los trabajos de correo en PostgreSQL y el worker los procesa. Stripe Checkout y el correo de compra están implementados; en Compose los mensajes se capturan en Mailpit y en Railway el worker los envía mediante la API de Resend.

## Requisitos y convenciones

- Docker Engine 28 o posterior, Docker CLI y el plugin de Compose, invocado como <code>docker compose</code>. Esta guía no usa el ejecutable independiente <code>docker-compose</code>. Docker documenta una excepción para versiones anteriores a Engine 28: otros equipos del mismo segmento de red podían alcanzar puertos enlazados a loopback. [Publicación de puertos en Docker](https://docs.docker.com/engine/network/port-publishing/) y [plugin de Docker Compose](https://docs.docker.com/compose/install/).
- Git, <code>curl</code> y una terminal Bash en Linux, macOS o WSL 2. Los comandos que crean archivos se ejecutan desde la raíz del repositorio, salvo que se indique otro directorio.
- No hace falta instalar Node.js ni npm en el equipo anfitrión: los comandos de Node se ejecutan en contenedores temporales y las aplicaciones se ejecutan en Compose.
- <code>.env.example</code> contiene valores ilustrativos; <code>.env</code> es local y no se versiona.

## Red interna de Compose y puertos

Compose crea una red bridge para el proyecto. Los contenedores se encuentran por el nombre del servicio; los puertos publicados se usan desde el equipo anfitrión. La red bridge de Compose y la dirección con que se publica un puerto en el anfitrión son configuraciones distintas.

~~~mermaid
flowchart LR
    Browser["Navegador del anfitrión"]
    subgraph Compose["Red bridge de Compose"]
        Frontend["frontend<br/>Next.js :3000"]
        Backend["backend<br/>Express :3000"]
        PostgreSQL[("postgres :5432")]
        Worker["worker<br/>Node.js"]
        Mailpit["mailpit<br/>SMTP :1025 · UI :8025"]
    end

    Browser -->|"localhost:3000 · tienda"| Frontend
    Browser -->|"localhost:4000 · API"| Backend
    Browser -->|"localhost:8025 · correo de desarrollo"| Mailpit
    Frontend -.->|"SSR · backend:3000 · red privada"| Backend
    Backend -->|"postgres:5432 · Prisma"| PostgreSQL
    Worker -->|"postgres:5432 · trabajos de correo"| PostgreSQL
    Worker -->|"SMTP · correo local"| Mailpit
~~~

| Servicio | Puerto dentro de Compose | Acceso desde el anfitrión |
|---|---:|---|
| Next.js | <code>frontend:3000</code> | <code>http://localhost:3000</code> |
| Express | <code>backend:3000</code> | <code>http://localhost:4000</code> |
| PostgreSQL | <code>postgres:5432</code> | <code>localhost:5432</code> para herramientas locales |
| Worker | Sin puerto HTTP | Sin puerto publicado |
| Mailpit SMTP | <code>mailpit:1025</code> | Sin puerto publicado; sólo red Compose |
| Mailpit UI | <code>mailpit:8025</code> | <code>http://localhost:8025</code> por defecto; configurable con <code>MAILPIT_PORT</code> |

Cuando Next.js consulte Express durante SSR, el destino será <code>http://backend:3000</code>, resoluble dentro de Compose. Las peticiones que el navegador envíe a la API usarán el puerto publicado del anfitrión, normalmente <code>http://localhost:4000</code>; el navegador no puede resolver el DNS privado <code>backend</code>.

Compose publica la API en el anfitrión. El navegador usa <code>NEXT_PUBLIC_API_URL</code> y Express permite el origen configurado en <code>FRONTEND_ORIGIN</code>. Para el acceso LAN, sigue la sección [Desarrollo por LAN](#desarrollo-lan); SSR conserva <code>http://backend:3000</code> dentro de Compose. El worker usa PostgreSQL y Mailpit por la red privada y no necesita un puerto HTTP.

## Mapa de entornos y recorridos

| Recorrido | Aplicación y acceso | Medios | Correo y pagos | Instrucciones |
|---|---|---|---|---|
| Desarrollo local estándar | Compose; navegador en `localhost` | Archivos locales servidos por Next.js | Mailpit; Stripe CLI opcional para pagos de prueba | [Desarrollo local](#desarrollo-local) |
| Desarrollo por LAN | Los mismos contenedores; navegador en la IP del anfitrión | Medios locales por LAN o URL pública de R2 | Mailpit; Stripe CLI puede reenviar al puerto publicado de la API | [Desarrollo LAN](#desarrollo-lan) |
| Prueba de medios con R2 desde Compose | Compose local, con URL pública no productiva de R2 | Bucket no productivo | Mailpit; no cambia el proveedor de correo | [Guía R2](../cloudflare/r2.md) |
| Staging | Servicios separados en Railway | Recursos R2 no productivos | Resend y credenciales Stripe de prueba | [Despliegue en Railway](../deployment/railway-staging-produccion.md) |
| Producción objetivo | Railway y la capa pública de Cloudflare | Bucket y hostname de producción | Resend y credenciales Stripe de producción | [Despliegue](../deployment/railway-staging-produccion.md) y [Cloudflare](../cloudflare/implementacion.md) |

El acceso LAN y el origen de los medios son opciones independientes que se pueden combinar. Para medios locales, la URL debe usar la IP del anfitrión; para R2, se usa su URL pública HTTPS. Mailpit conserva su SMTP privado en Compose y su bandeja web queda accesible desde la LAN al activar ese modo. Railway es la configuración separada para probar Resend y los servicios externos con recursos de staging.

## Imágenes y versiones de referencia

Las imágenes y versiones principales de ejecución siguientes reflejan los archivos versionados actuales. La tabla de paquetes es una selección para construir el esqueleto, no una lista completa de las dependencias actuales; consulta los manifiestos y lockfiles para todas las versiones. `create-next-app` 16.4.0 es la versión usada en el ejemplo inicial; la aplicación actual usa Next.js 16.4.1.

| Uso | Imagen / versión | Motivo |
|---|---|---|
| Herramientas Node y base de las imágenes frontend/backend | <code>node:24.21.0-bookworm-slim</code> | Node.js y npm sobre Debian Bookworm slim. También se usa en contenedores temporales para generar manifiestos y lockfiles. [Tags oficiales de Node.js](https://github.com/docker-library/official-images/blob/master/library/node) |
| Base de datos | <code>postgres:18.6-bookworm</code> | PostgreSQL 18. La imagen 18 usa <code>/var/lib/postgresql</code> como raíz del volumen persistente. [Imagen oficial de PostgreSQL](https://hub.docker.com/_/postgres) |
| Correo local | <code>axllent/mailpit:v1.31.5</code> | Servidor SMTP de desarrollo con UI en <code>8025</code> y SMTP en <code>1025</code>. [Imágenes Docker de Mailpit](https://mailpit.axllent.org/docs/install/docker/) |

Las dependencias JavaScript de referencia también se fijan al crear los manifiestos:

| Área | Paquetes de referencia |
|---|---|
| Backend y worker | Express <code>5.3.0</code>; Prisma CLI, <code>@prisma/client</code> y <code>@prisma/adapter-pg</code> <code>7.10.1</code>; <code>pg</code> <code>8.23.1</code> |
| Frontend | <code>create-next-app</code> <code>16.4.0</code>; Next.js <code>16.4.1</code>; React y React DOM <code>19.3.0</code>; Tailwind CSS, <code>@tailwindcss/postcss</code> y <code>@tailwindcss/turbopack</code> <code>4.3.3</code>; PostCSS <code>8.5.29</code> |

El <code>package-lock.json</code> registra las dependencias transitivas. Se conserva en Git y las imágenes instalan con <code>npm ci</code>; no se instala <code>node_modules</code> en el anfitrión. Prisma 7 usa un adaptador para conectarse a PostgreSQL y su configuración CLI define <code>DATABASE_URL</code> en <code>prisma.config.ts</code>. [Configuración oficial de Prisma Client 7](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction)

Para descargar las imágenes de servicio antes de iniciar Compose:

~~~bash
docker pull node:24.21.0-bookworm-slim
docker pull postgres:18.6-bookworm
docker pull axllent/mailpit:v1.31.5
~~~

Compose también puede descargarlas automáticamente. El comando <code>docker image ls</code> muestra las imágenes que ya existen localmente.

<a id="desarrollo-local"></a>
## Desarrollo local estándar

Desde la raíz del repositorio, crea `.env` si aún no existe. `cp -n` conserva cualquier archivo que ya tengas:

~~~bash
cp -n .env.example .env
~~~

Valida la sintaxis e interpolación antes de crear contenedores. Si falta una variable requerida, Compose lo indica aquí:

~~~bash
docker compose config --quiet
~~~

Construye las imágenes y espera a que los servicios estén en estado <code>healthy</code>:

~~~bash
docker compose up --build --detach --wait --wait-timeout 180
docker compose ps
~~~

En un clon de la aplicación completa, después del arranque aplica las migraciones existentes y, sólo para una base local de demostración, carga las tres fichas:

~~~bash
docker compose exec backend npm run prisma:migrate:deploy
docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/prisma/dev-showcase.sql
~~~

El SQL contiene precios provisionales y no es un catálogo comercial. El servicio `frontend-e2e` usa el perfil `e2e`; no arranca con el `up` normal y se solicita con `docker compose run --rm frontend-e2e`. La [guía de Railway](../deployment/railway-staging-produccion.md) explica los Dockerfiles de producción.

La primera ejecución descarga las imágenes de PostgreSQL y Mailpit, instala dependencias mediante <code>npm ci</code>, genera Prisma Client y crea el volumen y la red del proyecto. <code>--wait</code> hace que Compose espere a que PostgreSQL, Mailpit, backend, worker y frontend estén saludables antes de devolver el control. [Comando <code>docker compose up</code>](https://docs.docker.com/reference/cli/docker/compose/up/)

### Comprobar cada servicio

#### PostgreSQL, Prisma y API

~~~bash
docker compose exec --no-TTY postgres \
  sh -c 'pg_isready --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"'

docker compose exec --no-TTY backend npm run prisma:validate
docker compose exec --no-TTY backend npm run prisma:generate
curl --fail --show-error --silent http://localhost:4000/health
~~~

La respuesta esperada de <code>/health</code> es <code>{"status":"ok"}</code>. La ruta ejecuta <code>SELECT 1</code> con Prisma; si PostgreSQL no responde, Express devuelve HTTP 503. En este esqueleto inicial todavía no hay modelos de negocio ni migraciones; la aplicación actual sí los incluye.

Comprueba el estado de todos los servicios:

~~~bash
docker compose ps
docker compose logs --no-color --tail=30 worker
~~~

Todos los servicios deben aparecer como <code>Up</code> y <code>healthy</code>. En el esqueleto inicial el worker informa que PostgreSQL está disponible. En la aplicación actual aparece <code>Worker de correo iniciado.</code> y el proceso también atiende trabajos de correo.

#### Frontend

~~~bash
curl --fail --show-error --silent --output /dev/null \
  --write-out 'HTTP %{http_code}\n' \
  http://localhost:3000
~~~

El comando debe mostrar un estado HTTP <code>200</code>. Abre <code>http://localhost:3000</code> en un navegador: el esqueleto muestra la pantalla inicial de Next.js; el clon completo muestra la tienda.

#### Mailpit

Envía un mensaje de comprobación por el SMTP interno de Mailpit:

~~~bash
docker compose exec --no-TTY mailpit sendmail <<'EMAIL'
From: infra@example.test
To: developer@example.test
Subject: Mailpit SMTP check

El servidor SMTP local recibió este mensaje de prueba.
EMAIL
~~~

Abre <code>http://localhost:8025</code> (o el puerto definido por <code>MAILPIT_PORT</code>) y confirma que aparece el mensaje. Mailpit almacena correo temporal de desarrollo; no es un proveedor de envío ni un archivo de correo. Sus puertos predeterminados son UI <code>8025</code> y SMTP <code>1025</code>. [Documentación Docker de Mailpit](https://mailpit.axllent.org/docs/install/docker/)

### Flujo diario de Prisma

Cuando se agregue un modelo a <code>backend/prisma/schema.prisma</code>, crea y aplica una migración local con un nombre descriptivo:

~~~bash
docker compose exec --no-TTY \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  backend \
  npm run prisma:migrate:dev -- --name nombre_descriptivo
~~~

La migración se escribe en el directorio <code>backend/prisma</code> montado desde el host. Ejecutar este comando con el UID y GID del usuario anfitrión deja los archivos generados editables desde el host.

<code>migrate dev</code> es el comando de desarrollo: crea y aplica migraciones. Prisma 7 no ejecuta <code>prisma generate</code> automáticamente después de las migraciones, así que genera el cliente explícitamente:

~~~bash
docker compose exec backend npm run prisma:generate
~~~

Para aplicar migraciones ya versionadas en una base local:

~~~bash
docker compose exec backend npm run prisma:migrate:deploy
docker compose exec backend npm run prisma:migrate:status
~~~

No confirmes un reset si hay datos locales que necesites conservar. Prisma documenta <code>migrate dev</code> para desarrollo y <code>migrate deploy</code> para aplicar migraciones pendientes. En Prisma 7, <code>migrate dev</code> no ejecuta <code>prisma generate</code> automáticamente, por lo que los comandos aparecen como pasos separados. [Referencia CLI de Prisma 7](https://www.prisma.io/docs/orm/v7/reference/prisma-cli-reference)

### Verificaciones de la aplicación completa

Con el esquema aplicado, las pruebas y el lint del repositorio se ejecutan dentro de Compose:

~~~bash
docker compose exec backend npm test
docker compose exec backend npm run test:db
docker compose exec frontend npm test
docker compose run --rm frontend-e2e
docker compose exec backend npm run lint
docker compose exec frontend npm run lint
~~~

`frontend-e2e` está bajo el perfil `e2e`; al solicitar ese servicio expresamente Compose lo ejecuta sin incluirlo en el arranque normal. Las pruebas de base necesitan migraciones aplicadas y un entorno de prueba adecuado. Los comandos de este apartado describen cómo ejecutarlas; no indican que hayan pasado en esta revisión documental.

### Detener y limpiar

Detén los contenedores y la red sin borrar los datos de PostgreSQL:

~~~bash
docker compose down
~~~

Para volver a iniciar el entorno:

~~~bash
docker compose up --build --detach --wait --wait-timeout 180
~~~

Para borrar también el volumen y perder los datos locales de PostgreSQL:

~~~bash
docker compose down --volumes
~~~

No uses <code>--volumes</code> como solución rutinaria a un error de Prisma o Compose: elimina los datos persistidos. Revisa primero <code>docker compose logs --follow &lt;servicio&gt;</code> y el estado mostrado por <code>docker compose ps</code>.
<a id="desarrollo-lan"></a>
## Desarrollo por LAN

Usa este modo para abrir la tienda desde otro equipo o teléfono conectado a la misma red. Indica la IPv4 del anfitrión; el script publica la tienda, la API y la bandeja web de Mailpit para el acceso LAN, y deja PostgreSQL con el enlace definido en `.env` y el SMTP de Mailpit sólo en la red interna de Compose.

Next.js ejecuta `next dev`; las interacciones del navegador para cuentas y carritos llaman a Express, así que el modo LAN publica tanto el frontend como la API. La red privada de Compose y la dirección `backend:3000` para SSR no cambian.

Para usar medios locales:

~~~bash
scripts/dev-lan.sh up 192.168.1.20
~~~

El script usa los puertos configurados en `.env` (`FRONTEND_PORT`, `BACKEND_PORT` y `MAILPIT_PORT`). Con los valores predeterminados, abre la tienda en `http://192.168.1.20:3000`, la API en `http://192.168.1.20:4000` y Mailpit en `http://192.168.1.20:8025`; sustituye la IP por la del anfitrión. Si cambiaste los puertos, el script imprime las direcciones resultantes. La interfaz de Mailpit queda disponible para revisar los mensajes generados durante las pruebas.

Para que el dispositivo cargue los medios desde R2, pasa la URL pública HTTPS del bucket no productivo:

~~~bash
scripts/dev-lan.sh up 192.168.1.20 --media-url https://pub-47df7d3a7dd94d268c1661b2c36e0ae5.r2.dev
~~~

Con `--media-url`, el script establece esa URL en `MEDIA_BASE_URL` y `STRIPE_MEDIA_BASE_URL` y reconstruye las imágenes para que Next.js admita el origen. Esto sólo cambia las URL usadas para obtener medios; no abre puertos para R2 ni cambia el worker de correo. Sin esa opción, las imágenes se sirven desde la aplicación en la dirección LAN.

Si modificas `frontend/next.config.mjs`, reconstruye la imagen del frontend porque Compose no monta ese archivo. El script ya usa `--build` cuando recibe `--media-url`.

En ambos casos, `NEXT_PUBLIC_API_URL`, `FRONTEND_ORIGIN` y `APP_BASE_URL` usan la IP del anfitrión. `NEXT_ALLOWED_DEV_ORIGIN` recibe sólo el hostname, sin protocolo ni puerto. `INTERNAL_API_URL=http://backend:3000` permanece sin cambios: Next.js sigue consultando Express por la red privada de Compose. El worker continúa usando Mailpit por `mailpit:1025`.

Para volver al modo local estándar, sin cambiar `.env` ni borrar datos de PostgreSQL:

~~~bash
scripts/dev-lan.sh off
~~~

El comando recrea frontend, API, worker y Mailpit con los valores base de `.env` y retira el archivo temporal de configuración LAN. Si cambia la IP del anfitrión, vuelve a activar el modo con la nueva dirección.

El script conserva los valores de `.env` y añade un archivo temporal sólo para Compose. Compose procesa los archivos `--env-file` en orden y los posteriores pueden reemplazar los anteriores; consulta la [documentación oficial de interpolación de variables](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) para más detalles.

### Dos proyectos activos en el mismo equipo

Cada proyecto necesita un `COMPOSE_PROJECT_NAME` distinto y puertos de anfitrión que no estén ocupados. Por ejemplo, para una segunda copia local puedes ajustar `.env` así:

~~~dotenv
COMPOSE_PROJECT_NAME=sr-del-mictlan-segunda-copia
FRONTEND_PORT=3001
BACKEND_PORT=4001
POSTGRES_PORT=5433
MAILPIT_PORT=8026
~~~

El script de LAN toma esos puertos y configura las URL públicas del navegador. La API conserva `INTERNAL_API_URL=http://backend:3000` dentro de Compose. Para Stripe CLI, usa el puerto publicado de esa copia —`localhost:4001` en este ejemplo— y sigue la [guía de Stripe](../stripe/implementacion.md). `MAILPIT_PORT` es el puerto de anfitrión de la bandeja web; el SMTP continúa en `mailpit:1025` dentro de Compose.

## Integraciones externas y staging

- **R2 desde desarrollo local:** puedes usar la opción `--media-url` del script LAN para probar el origen público desde otro dispositivo. La [guía de R2](../cloudflare/r2.md) mantiene el inventario, los requisitos del bucket y las comprobaciones de medios.
- **Stripe en desarrollo local:** Stripe CLI reenvía los webhooks de prueba a la API local; sigue la [guía de Stripe](../stripe/implementacion.md). Stripe Checkout usa `STRIPE_MEDIA_BASE_URL` sólo si necesita descargar imágenes desde una URL pública.
- **Resend:** Compose fija `NODE_ENV=development` y el worker usa SMTP con Mailpit. Resend se valida en Railway staging con su clave y remitentes de ese entorno; no actives Resend cambiando el modo LAN. Consulta la [guía de Resend](../resend/implementacion.md).
- **Staging y producción:** la [guía de Railway](../deployment/railway-staging-produccion.md) es la instrucción operativa para servicios, variables, secretos, migraciones y aceptación. La [guía de Cloudflare](../cloudflare/implementacion.md) organiza DNS, proxy y dominios; la [guía de R2](../cloudflare/r2.md) cubre medios.

El estado de cada recurso externo y las comprobaciones realizadas se documentan en su guía específica. Esta sección ofrece el mapa para elegir el recorrido sin duplicar esos procedimientos.

## Tutorial reproducible: construir el esqueleto desde cero

Estas secciones conservan los pasos y ejemplos mínimos para reconstruir la base técnica. Haz este ejercicio en una carpeta vacía; nunca sobrescribas un clon existente. No sustituyen el modo de desarrollo local de la aplicación completa.

### 1. Preparar archivos comunes

Desde la raíz del repositorio, crea la estructura inicial del backend:

~~~bash
mkdir -p backend/src/database backend/src/scripts backend/prisma
~~~

El repositorio ya contiene un <code>.gitignore</code> en la raíz. Añade esta regla para excluir el cliente de Prisma generado:

~~~gitignore
backend/generated/prisma/
~~~

Crea <code>.env.example</code> en la raíz:

~~~dotenv
COMPOSE_PROJECT_NAME=sr-del-mictlan-mezcal

POSTGRES_DB=mictlan_dev
POSTGRES_USER=mictlan_dev
POSTGRES_PASSWORD=postgres_local_only
POSTGRES_BIND_ADDRESS=127.0.0.1
POSTGRES_PORT=5432

BACKEND_BIND_ADDRESS=127.0.0.1
BACKEND_PORT=4000
FRONTEND_BIND_ADDRESS=127.0.0.1
FRONTEND_PORT=3000
# For LAN testing, set this to the host's LAN IP.
MAILPIT_BIND_ADDRESS=127.0.0.1
MAILPIT_PORT=8025

INTERNAL_API_URL=http://backend:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
MEDIA_BASE_URL=http://localhost:3000
STRIPE_MEDIA_BASE_URL=
NEXT_ALLOWED_DEV_ORIGIN=
FRONTEND_ORIGIN=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# For LAN testing, use the frontend's LAN origin here as well.
APP_BASE_URL=http://localhost:3000
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
MAIL_FROM=noreply@senordelmictlan.local
RESEND_API_KEY=
RESEND_FROM=
~~~

Copia el archivo para crear la configuración privada de este equipo:

~~~bash
cp -n .env.example .env
~~~

<code>cp -n</code> conserva un <code>.env</code> existente. Si ya tienes ese archivo, edítalo en lugar de reemplazarlo.

Los valores de contraseña anteriores son sólo para desarrollo local. Si cambias <code>POSTGRES_PASSWORD</code>, procura que los caracteres de la URL estén codificados correctamente; una contraseña simple con letras, números y guion bajo evita confundir <code>DATABASE_URL</code>. Cambiar las variables de inicialización de PostgreSQL no cambia las credenciales de un volumen que ya contiene una base inicializada.

### 2. Crear el backend, Prisma y el worker

#### 2.1 Crear los manifiestos del backend

Este manifiesto es el punto de partida del ejercicio. El backend completo del repositorio ya incluye además Stripe, Nodemailer, ESLint y sus propios scripts y pruebas; no sustituyas su `package.json` ni su lockfile por este ejemplo.

Crea <code>backend/package.json</code>:

~~~json
{
  "name": "sr-del-mictlan-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "worker:dev": "node --watch src/worker.js",
    "prisma:generate": "prisma generate",
    "prisma:validate": "prisma validate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:migrate:status": "prisma migrate status"
  }
}
~~~

El manifiesto usa ESM desde el inicio. Instala las dependencias de ejecución con versiones explícitas dentro de un contenedor temporal. <code>--package-lock-only</code> escribe el lockfile sin crear <code>node_modules</code> en el anfitrión:

~~~bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --volume "$PWD/backend:/app" \
  --workdir /app \
  node:24.21.0-bookworm-slim \
  npm install --package-lock-only --save-exact \
    express@5.3.0 \
    @prisma/client@7.10.1 \
    @prisma/adapter-pg@7.10.1 \
    pg@8.23.1
~~~

Instala la CLI de Prisma como dependencia de desarrollo:

~~~bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --volume "$PWD/backend:/app" \
  --workdir /app \
  node:24.21.0-bookworm-slim \
  npm install --package-lock-only --save-dev --save-exact prisma@7.10.1
~~~

#### 2.2 Definir Prisma en el backend base

Crea <code>backend/prisma/schema.prisma</code> antes del Dockerfile. El cliente generado queda en <code>backend/generated/prisma</code>, fuera de <code>backend/src</code>, que se montará como volumen de desarrollo:

~~~prisma
generator client {
  provider               = "prisma-client"
  output                 = "../generated/prisma"
  runtime                = "nodejs"
  moduleFormat           = "esm"
  generatedFileExtension = "mts"
  importFileExtension    = "mts"
}

datasource db {
  provider = "postgresql"
}
~~~

El generador <code>prisma-client</code> de Prisma 7 requiere un <code>output</code> explícito. Esta ruta evita que montar <code>backend/src</code> oculte el cliente generado en la imagen. Prisma permite generar el cliente aunque el esquema todavía no tenga modelos; el mismo comando sirve cuando el proyecto agregue los suyos. [Referencia del generador de Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators) y [comando <code>prisma generate</code> de Prisma 7](https://www.prisma.io/docs/cli/v7/generate)

Crea <code>backend/prisma.config.ts</code>:

~~~ts
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
~~~

<code>DATABASE_URL</code> la entregará Compose al backend y al worker. La ruta interna debe usar el nombre de servicio <code>postgres</code>, nunca <code>localhost</code>, porque dentro de un contenedor <code>localhost</code> se refiere a ese mismo contenedor.

Crea <code>backend/src/database/prisma-client.js</code>:

~~~js
import { PrismaClient } from '../../generated/prisma/client.mts';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es necesaria para iniciar Prisma.');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
~~~

La aplicación usa módulos ESM desde el primer día (<code>"type": "module"</code>), alineados con el cliente generado por Prisma. Prisma Client 7 requiere pasar el adaptador PostgreSQL al constructor. [Configuración oficial de Prisma Client 7](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction)

#### 2.3 Crear una API mínima cuya salud verifique PostgreSQL

Crea <code>backend/src/server.js</code>:

~~~js
import express from 'express';
import { prisma } from './database/prisma-client.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.get('/health', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.status(200).json({ status: 'ok' });
  } catch {
    response.status(503).json({ status: 'unavailable' });
  }
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`API escuchando en el puerto ${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
~~~

<code>0.0.0.0</code> hace que Express acepte conexiones en las interfaces del contenedor. No publica el puerto en el anfitrión; Compose configura ese mapeo por separado.

#### 2.4 Crear el proceso base del worker

Crea <code>backend/src/worker.js</code>:

~~~js
import { prisma } from './database/prisma-client.js';

let interval;
let stopping = false;

async function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  clearInterval(interval);
  await prisma.$disconnect();
  process.exit(exitCode);
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('El worker perdió la conexión con PostgreSQL:', error);
    await stop(1);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => void stop());
}

await checkDatabase();
console.log('Worker iniciado; PostgreSQL está disponible.');
interval = setInterval(() => void checkDatabase(), 30_000);
~~~

Para que Docker pueda consultar el estado de este proceso, crea <code>backend/src/worker-healthcheck.js</code>:

~~~js
import { prisma } from './database/prisma-client.js';

try {
  await prisma.$queryRaw`SELECT 1`;
} catch {
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
~~~

En este paso del tutorial, el worker sólo comprueba que alcanza PostgreSQL. La aplicación actual sí procesa trabajos de correo, como se describe al inicio de esta guía.

### 3. Generar el frontend Next.js con Tailwind

<code>create-next-app</code> genera <code>frontend/</code> como subdirectorio de la raíz. Se monta el repositorio completo en <code>/workspace</code> porque el generador necesita un nombre de proyecto explícito; no uses <code>.</code> como destino.

~~~bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --volume "$PWD:/workspace" \
  --workdir /workspace \
  node:24.21.0-bookworm-slim \
  npx --yes create-next-app@16.4.0 frontend \
    --js \
    --app \
    --src-dir \
    --tailwind \
    --use-npm \
    --skip-install \
    --no-eslint \
    --yes
~~~

El comando selecciona JavaScript, App Router, <code>src/</code>, Tailwind y npm. <code>--skip-install</code> evita instalar dependencias en el volumen compartido; <code>--yes</code> acepta los valores predeterminados para cualquier opción no especificada. [Opciones oficiales de <code>create-next-app</code>](https://nextjs.org/docs/app/getting-started/installation)

Fija las versiones de frontend y crea el lockfile dentro de la imagen temporal de Node:

~~~bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --volume "$PWD/frontend:/app" \
  --workdir /app \
  node:24.21.0-bookworm-slim \
  npm install --package-lock-only --save-exact \
    next@16.4.1 react@19.3.0 react-dom@19.3.0
~~~

~~~bash
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --volume "$PWD/frontend:/app" \
  --workdir /app \
  node:24.21.0-bookworm-slim \
  npm install --package-lock-only --save-dev --save-exact \
    tailwindcss@4.3.3 \
    @tailwindcss/postcss@4.3.3 \
    @tailwindcss/turbopack@4.3.3 \
    postcss@8.5.29
~~~

El scaffold de <code>create-next-app</code> configura Tailwind para el bundler Turbopack mediante <code>@tailwindcss/turbopack</code>. Conserva esa configuración en <code>frontend/next.config.mjs</code> y fija el paquete a la misma versión exacta de Tailwind:

~~~js
/** @type {import('next').NextConfig} */
const mediaBaseUrl = new URL(process.env.MEDIA_BASE_URL || 'http://localhost:3000');
const mediaBasePath = mediaBaseUrl.pathname.replace(/\/+$/, '');
const mediaRemotePattern = new URL(`${mediaBaseUrl.origin}${mediaBasePath}/**`);

const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [mediaRemotePattern],
  },
  allowedDevOrigins: process.env.NEXT_ALLOWED_DEV_ORIGIN
    ? [process.env.NEXT_ALLOWED_DEV_ORIGIN]
    : [],
  turbopack: {
    rules: {
      "*.css": {
        condition: { path: /src\/app\/globals\.css$/ },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
~~~

<code>images.remotePatterns</code> toma el origen y la ruta de <code>MEDIA_BASE_URL</code> para permitir imágenes de R2 en <code>next/image</code>. Esta variable se entrega a backend y frontend en Compose; no cambia la publicación de puertos.

Confirma también que <code>frontend/src/app/globals.css</code> conserva la importación:

~~~css
@import 'tailwindcss';
~~~

El starter generado por la versión fijada de <code>create-next-app</code> usa el loader de Tailwind para Turbopack. Next.js 16 usa Turbopack por defecto en desarrollo y build; su guía CSS también documenta la integración PostCSS para proyectos que elijan esa ruta. Esta base conserva la configuración del starter y fija sus paquetes para que el scaffold no dependa de rangos flotantes. [Turbopack en Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16), [CSS en Next.js](https://nextjs.org/docs/app/getting-started/css)

### 4. Definir las imágenes de las aplicaciones

Las dos imágenes Node instalan dependencias mediante <code>npm ci</code>. Prisma se copia y genera durante la construcción del backend. El backend instala OpenSSL para sus herramientas Prisma en Debian slim.

Crea <code>backend/.dockerignore</code>:

~~~dockerignore
node_modules
generated
coverage
dist
*.log
.env
.env.*
!.env.example
~~~

El siguiente Dockerfile es el ejemplo mínimo del esqueleto. El [Dockerfile de desarrollo versionado](../../backend/Dockerfile) añade la copia de configuración de ESLint; para la aplicación completa usa el archivo versionado.

Crea <code>backend/Dockerfile</code>:

~~~dockerfile
FROM node:24.21.0-bookworm-slim

ENV NODE_ENV=development

WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node prisma.config.ts ./prisma.config.ts
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src

RUN mkdir -p /app/generated \
    && chown node:node /app/generated

USER node

RUN DATABASE_URL='postgresql://generate:generate@127.0.0.1:5432/generate' \
    npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:generate && exec npm run dev"]
~~~

La URL ficticia de <code>RUN</code> sólo satisface la lectura de <code>DATABASE_URL</code> al cargar <code>prisma.config.ts</code> durante <code>prisma generate</code>; no abre una conexión ni se conserva como variable de ejecución. Compose sustituirá la URL real al arrancar el contenedor. El directorio <code>generated/</code> queda escribible por <code>node</code>, por lo que el comando de inicio puede regenerar el cliente después de montar el esquema local.

Crea <code>frontend/.dockerignore</code>:

~~~dockerignore
node_modules
.next
coverage
dist
*.log
.env
.env.*
!.env.example
~~~

Crea <code>frontend/Dockerfile</code>:

~~~dockerfile
FROM node:24.21.0-bookworm-slim

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN mkdir -p .next && chown node:node .next

USER node

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
~~~

El servidor Next.js escucha en <code>0.0.0.0</code> dentro del contenedor para aceptar tráfico que Compose reenvía. Esto no expone por sí solo el servicio en interfaces de red del anfitrión; esa decisión se toma en <code>ports</code>. El directorio <code>.next</code> se crea con permisos de <code>node</code>, que ejecuta Next.js y necesita escribir ahí durante el desarrollo.

### 5. Declarar PostgreSQL, Mailpit y aplicaciones en Compose

Crea <code>compose.yaml</code> en la raíz:

~~~yaml
services:
  postgres:
    image: postgres:18.6-bookworm
    environment:
      POSTGRES_DB: ${POSTGRES_DB:?Define POSTGRES_DB in .env}
      POSTGRES_USER: ${POSTGRES_USER:?Define POSTGRES_USER in .env}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Define POSTGRES_PASSWORD in .env}
    ports:
      - "${POSTGRES_BIND_ADDRESS:-127.0.0.1}:${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready --username=$$POSTGRES_USER --dbname=$$POSTGRES_DB"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s
    restart: unless-stopped

  mailpit:
    image: axllent/mailpit:v1.31.5
    ports:
      - "${MAILPIT_BIND_ADDRESS:-127.0.0.1}:${MAILPIT_PORT:-8025}:8025"
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8025/readyz"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 5s
    restart: unless-stopped

  backend:
    image: ${COMPOSE_PROJECT_NAME:-mictlan-mezcal}-backend:dev
    build: ./backend
    init: true
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
      MEDIA_BASE_URL: ${MEDIA_BASE_URL:-http://localhost:3000}
      STRIPE_MEDIA_BASE_URL: ${STRIPE_MEDIA_BASE_URL:-}
      FRONTEND_ORIGIN: ${FRONTEND_ORIGIN:-http://localhost:3000}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-}
    ports:
      - "${BACKEND_BIND_ADDRESS:-127.0.0.1}:${BACKEND_PORT:-4000}:3000"
    volumes:
      - ./backend/src:/app/src
      - ./backend/prisma:/app/prisma
      - ./backend/prisma.config.ts:/app/prisma.config.ts:ro
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  worker:
    image: ${COMPOSE_PROJECT_NAME:-mictlan-mezcal}-backend:dev
    build: ./backend
    init: true
    command: ["sh", "-c", "npm run prisma:generate && exec npm run worker:dev"]
    environment:
      NODE_ENV: development
      DATABASE_URL: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
      APP_BASE_URL: ${APP_BASE_URL:-http://localhost:3000}
      SMTP_HOST: ${SMTP_HOST:-mailpit}
      SMTP_PORT: ${SMTP_PORT:-1025}
      SMTP_SECURE: ${SMTP_SECURE:-false}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      MAIL_FROM: ${MAIL_FROM:-noreply@senordelmictlan.local}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      RESEND_FROM: ${RESEND_FROM:-}
    depends_on:
      postgres:
        condition: service_healthy
      mailpit:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src
      - ./backend/prisma:/app/prisma
      - ./backend/prisma.config.ts:/app/prisma.config.ts:ro
    healthcheck:
      test: ["CMD", "node", "src/worker-healthcheck.js"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  frontend:
    image: ${COMPOSE_PROJECT_NAME:-mictlan-mezcal}-frontend:dev
    build: ./frontend
    init: true
    environment:
      NODE_ENV: development
      NEXT_TELEMETRY_DISABLED: "1"
      INTERNAL_API_URL: ${INTERNAL_API_URL:-http://backend:3000}
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:4000}
      MEDIA_BASE_URL: ${MEDIA_BASE_URL:-http://localhost:3000}
      NEXT_ALLOWED_DEV_ORIGIN: ${NEXT_ALLOWED_DEV_ORIGIN:-}
    command: ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
    ports:
      - "${FRONTEND_BIND_ADDRESS:-127.0.0.1}:${FRONTEND_PORT:-3000}:3000"
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/tests:/app/tests
      - ./frontend/public:/app/public
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    restart: unless-stopped

  frontend-e2e:
    profiles:
      - e2e
    image: ${COMPOSE_PROJECT_NAME:-mictlan-mezcal}-frontend-e2e:dev
    build:
      context: ./frontend
      dockerfile: Dockerfile.e2e
    init: true
    environment:
      NODE_ENV: development
      CI: "true"
      NEXT_TELEMETRY_DISABLED: "1"
      INTERNAL_API_URL: http://backend:3000
      NEXT_PUBLIC_API_URL: http://backend:3000
      MEDIA_BASE_URL: http://localhost:3100
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
      - ./frontend/e2e:/app/e2e
      - ./frontend/playwright.config.js:/app/playwright.config.js:ro
    command: ["npm", "run", "test:e2e"]
    depends_on:
      backend:
        condition: service_healthy

volumes:
  postgres_data:
~~~

Este Compose reproduce el archivo versionado de la aplicación completa, incluido el perfil opcional `e2e`. Si estás construyendo únicamente el esqueleto, el servicio E2E requiere los archivos adicionales de Playwright del frontend completo y permanece desactivado en el arranque normal. El endpoint <code>/readyz</code> de Mailpit devuelve HTTP 200 cuando está listo. El worker usa un script pequeño que verifica la conexión a PostgreSQL para que Docker también pueda reportar su estado de salud. [Health checks de Mailpit](https://mailpit.axllent.org/docs/integration/healthcheck/)

#### Decisiones de Compose

- Compose crea una red bridge <code>&lt;nombre-del-proyecto&gt;_default</code> y DNS para cada servicio. El backend y el worker usan <code>postgres:5432</code>; el worker envía correo local por <code>mailpit:1025</code>. No fijes IPs ni uses <code>localhost</code> para conectar dos contenedores. [Redes de Compose](https://docs.docker.com/compose/how-tos/networking/)
- Sólo se publican los puertos que necesita el anfitrión. PostgreSQL, la API, el frontend y la UI de Mailpit se enlazan por defecto a <code>127.0.0.1</code>; el SMTP de Mailpit no publica puerto. El [desarrollo por LAN](#desarrollo-lan) activa la publicación del frontend, la API y la UI de Mailpit. [Publicación de puertos](https://docs.docker.com/engine/network/port-publishing/)
- PostgreSQL 18 monta el volumen en <code>/var/lib/postgresql</code>; PostgreSQL 17 y anteriores requieren otra ruta. La ruta oficial de la versión debe coincidir con el volumen de Compose. [Imagen oficial de PostgreSQL: PGDATA y volúmenes](https://hub.docker.com/_/postgres)
- PostgreSQL usa un volumen nombrado. <code>docker compose down</code> lo conserva; <code>docker compose down --volumes</code> lo elimina.
- El worker comparte la imagen y las dependencias del backend, pero ejecuta otro proceso. Lee y actualiza trabajos de correo en PostgreSQL y no necesita puerto HTTP. El esqueleto de este tutorial sólo verifica la conectividad con la base.
- Next.js usa <code>backend:3000</code> para las consultas SSR privadas. Las interacciones iniciadas por el navegador usan <code>NEXT_PUBLIC_API_URL</code> y el puerto publicado de Express.
- El directorio generado de Prisma se encuentra en <code>/app/generated</code>, fuera de los volúmenes montados. Así, el montaje de <code>src/</code> no oculta el cliente y el inicio regenera el cliente a partir del esquema local.
