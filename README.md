# Señor del Mictlán

![Architecture](./docs/architecture/ARCHITECTURE.png)

Señor del Mictlán reúne mezcales de agave Cupreata silvestre y destilados procedentes de Etúcuaro, Michoacán. Este repositorio contiene el desarrollo de su tienda en línea, landing y catálogo digital.

## Stack

| Área | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | Next.js, React y Tailwind CSS 4 | Interfaz de la tienda, landing y catálogo público |
| Backend | Node.js y Express | API REST, autenticación, reglas de negocio y webhooks de Stripe |
| Base de datos | PostgreSQL en Railway | Usuarios, productos, carritos, pedidos y trabajos de correo |
| ORM y migraciones | Prisma ORM y Prisma Migrate | Acceso a PostgreSQL y migraciones versionadas del esquema |
| Tareas asíncronas | PostgreSQL | Guardar los trabajos de correo pendientes para que el worker los procese |
| Worker | Node.js en Railway | Leer y actualizar los trabajos en PostgreSQL y solicitar el envío a Resend |
| Pagos | Stripe Checkout | Checkout alojado y notificaciones firmadas de pago |
| Correo | Resend | Correos transaccionales, como recuperación de contraseña y confirmación de pedidos |
| Medios | Cloudflare R2 | Almacenar y entregar imágenes de producto y medios de la landing |
| Capa pública | Cloudflare Free | DNS autoritativo; proxy/CDN y TLS para los hostnames públicos; WAF, protección DDoS y Bot Fight Mode |
| Despliegue | Railway | Alojar frontend, backend, worker y PostgreSQL |

## Arquitectura

En producción, Cloudflare publica la tienda, el endpoint de la API para webhooks de Stripe y los medios. El navegador envía las solicitudes de la aplicación al mismo origen del frontend, bajo `/api/backend/*`; Next.js las reenvía a Express por la red privada de Railway. El renderizado del servidor también consulta Express por esa red. Stripe entrega sus webhooks al endpoint público de la API. El navegador carga las imágenes y los medios desde Cloudflare R2.

La decisión de renderizado y los criterios SEO están en [Renderizado y SEO](docs/architecture/RENDERING-AND-SEO.md).

El diagrama muestra las conexiones entre el navegador, Cloudflare, Railway y los servicios externos.

```mermaid
flowchart TB
    browser["Cliente / navegador"]
    cf["Cloudflare<br/>DNS · proxy/CDN · TLS"]
    stripe["Stripe<br/>Checkout alojado"]
    resend["Resend<br/>API de correo"]
    r2[("Cloudflare R2<br/>imágenes y medios de la landing")]

    subgraph railway["Railway · producción"]
        web["Frontend<br/>Next.js + Tailwind CSS · público"]
        api["Backend<br/>Express REST + webhook · público"]
        pg[("PostgreSQL<br/>datos del negocio y trabajos de correo<br/>red privada + volumen persistente")]
        worker["Worker<br/>correos · proceso separado"]

        web -.->|"SSR y proxy /api/backend/*<br/>red privada"| api
        api -->|"SQL: datos del negocio y trabajos de correo<br/>red privada"| pg
        pg -->|"Entrega trabajos pendientes<br/>red privada"| worker
        worker -->|"Actualiza el estado del trabajo<br/>red privada"| pg
    end

    browser -->|"HTTPS: tienda y solicitudes /api/backend/*"| cf
    cf -->|"Hostname de tienda"| web
    cf -->|"Endpoint público de API para el webhook de Stripe"| api

    api -->|"Crear sesión de Checkout"| stripe
    stripe -->|"URL de Checkout"| api
    api -->|"Respuesta de API por el proxy"| web
    web -->|"Respuesta HTTPS"| cf
    cf --> browser
    browser -->|"Pago en página alojada"| stripe
    stripe -->|"Regreso del navegador<br/>solo para UX"| browser
    stripe -->|"Webhook firmado por HTTPS"| cf

    worker -->|"Envía correos transaccionales"| resend

    browser -->|"GET de medios"| cf
    cf -->|"Hostname de medios"| r2
```

### Flujos principales

Los recorridos distinguen la carga SSR, las solicitudes del navegador que pasan por el proxy del frontend y el webhook público de Stripe.

#### Carga de una página renderizada por servidor

```mermaid
sequenceDiagram
    participant Browser as Navegador
    participant CF as Cloudflare
    participant Next as Next.js
    participant Express as Express API
    participant PG as PostgreSQL

    Browser->>CF: HTTPS: solicitar página
    CF->>Next: Hostname de tienda
    Next->>Express: Consulta SSR · red privada
    Express->>PG: Consulta de datos · red privada
    PG-->>Express: Datos
    Express-->>Next: Datos para SSR
    Next-->>CF: HTML + JavaScript
    CF-->>Browser: Página renderizada
```

#### Interacción que requiere la API

```mermaid
sequenceDiagram
    participant Browser as Navegador
    participant CF as Cloudflare
    participant Next as Next.js · frontend
    participant Express as Express API

    Browser->>CF: HTTPS: petición al origen del frontend · /api/backend/auth/login
    CF->>Next: Hostname de la tienda
    Next->>Express: Proxy a /api/auth/login · red privada Railway
    Express-->>Next: Respuesta y cookie de sesión
    Next-->>CF: Respuesta bajo el origen del frontend
    CF-->>Browser: Respuesta y cookie de primera parte
```

- Express comprueba que los productos sigan activos y usa sus precios vigentes; PostgreSQL conserva el pedido y sus datos históricos. El MVP no comprueba existencias.
- Express crea la sesión de Stripe y devuelve al navegador la URL para abrir el Checkout alojado.
- El backend verifica la firma del webhook de Stripe. Cuando confirma un pago, valida la sesión, el importe y la moneda antes de marcar el pedido como pagado; en la misma transacción registra en PostgreSQL el trabajo de confirmación. El worker procesa ese trabajo y envía el correo mediante Resend. Los eventos de pago fallido o Checkout expirado cierran el pedido pendiente sin generar ese correo. Al volver de Checkout, la página consulta al backend el estado del pedido; sólo el webhook firmado puede confirmarlo como pagado.
- El navegador obtiene las imágenes de producto y los medios de la landing mediante Cloudflare R2. PostgreSQL conserva referencias y metadatos, no los archivos.

## Ramas y despliegues

La rama predeterminada del repositorio en GitHub es `develop`, que integra los cambios y despliega a staging. `main` corresponde a producción.

GitHub tiene activada la opción **Automatically delete head branches**: al fusionar un pull request, elimina automáticamente su rama de origen.

```text
feature/* ── pull request ──> develop ──> Railway staging
                                  │
                           pull request
                                  ↓
                                main ──> Railway producción
```

## Clonar y configurar el repositorio

Se requiere Git, Docker Engine y Docker Compose. Desde la carpeta donde guardarás el proyecto:

Para entender o reproducir la construcción de la infraestructura local desde cero, consulta la [guía de Docker Compose](docs/architecture/docker/COMPOSE.md). Si clonaste la aplicación actual, usa los archivos ya incluidos y sigue los comandos de esta sección.

```bash
git clone https://github.com/sadamlg/sr_del_mictlan_mezcal.git
cd sr_del_mictlan_mezcal
cp .env.example .env
```

`.env.example` contiene valores de desarrollo locales. `.env` está excluido de Git; conserva allí sólo credenciales de desarrollo y nunca agregues secretos reales al repositorio.

### Iniciar el entorno

Valida la configuración y construye e inicia los servicios en segundo plano:

```bash
docker compose config --quiet
docker compose up --build --detach --wait --wait-timeout 180
docker compose ps
```

La opción `--build` reconstruye las imágenes antes de iniciar los contenedores.

Docker Compose construye las imágenes del frontend y backend, y levanta frontend, API, PostgreSQL, worker de correos y Mailpit. `--wait` espera los health checks de los servicios. Los procesos de desarrollo se ejecutan dentro de sus contenedores: el frontend con `npm run dev`, el backend genera Prisma Client y arranca Node con observación de cambios, y el worker con `npm run worker:dev`. No hace falta instalar Node.js en el anfitrión ni iniciar esos procesos manualmente.

| Servicio o endpoint | Dirección local |
|---|---|
| Tienda frontend | [http://localhost:3000](http://localhost:3000) |
| API; comprobar salud | [http://localhost:4000/health](http://localhost:4000/health) |
| API; catálogo público | [http://localhost:4000/api/catalog/products](http://localhost:4000/api/catalog/products) |
| API; contador de visitas | [http://localhost:4000/api/visits](http://localhost:4000/api/visits) |
| [Webhook de Stripe (Stripe CLI)](docs/architecture/services/STRIPE.md) | `POST http://localhost:4000/api/webhooks/stripe` |
| Mailpit; bandeja de correo de desarrollo | [http://localhost:8025](http://localhost:8025) |
| PostgreSQL | `localhost:5432` |

### Reiniciar, recrear o reconstruir frontend y API

Usa el comando según el tipo de cambio:

```bash
# Reinicia los procesos dentro de los contenedores existentes.
docker compose restart frontend backend

# Recrea ambos contenedores para aplicar cambios de .env o compose.yaml.
docker compose up --detach --force-recreate frontend backend

# Reconstruye sus imágenes y recrea los contenedores tras cambiar Dockerfiles,
# dependencias o configuración de Next.js que se copia a la imagen.
docker compose up --build --detach --force-recreate frontend backend
```

Usa `restart` si el proceso del frontend o de la API se detuvo o quedó bloqueado. Los cambios normales de código se aplican automáticamente durante el desarrollo.

Para consultar la salida de los servicios, ejecuta `docker compose logs --follow`; Ctrl+C deja los contenedores en ejecución. Para detenerlos:

```bash
docker compose down
```

Este comando conserva los volúmenes locales de PostgreSQL. `docker compose down -v` también los elimina y borra los datos locales.
