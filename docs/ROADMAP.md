# Roadmap

Estado de implementación del [MVP aprobado](MVP_SCOPE.md). El roadmap fija la secuencia, dependencias, decisiones de planificación, resultados y comprobaciones de cada fase. Las guías de [Docker](architecture/docker/COMPOSE.md) y de [servicios externos](architecture/services/) conservan sus rutas y pasos detallados; aquí se enlazan donde se necesitan.

Las decisiones duraderas del repositorio siguen en [AGENTS.md](../AGENTS.md), el alcance en [MVP_SCOPE.md](MVP_SCOPE.md), los contratos en [contracts](contracts/) y las instrucciones de proveedor en [architecture](architecture/). Este documento organiza su aplicación por fase, sin duplicar las reglas generales.

| Fase | Resultado | Estado |
|---|---|---|
| 00 · Creación y configuración del repositorio | Repositorio GitHub, ramas y documentación inicial | Planeada |
| 01 · Entorno local y Docker | Stack reproducible en Compose, con acceso local y opción LAN | Planeada |
| 02 · Alcance y arquitectura | Alcance maestro y arquitectura transversal; los contratos de módulo se detallan en sus fases | Planeada |
| 03 · Landing, catálogo y medios | Catálogo, presentación, medios y carga pública | Planeada |
| 04 · Cuentas y perfil | Registro, confirmación, sesión, recuperación y perfil | Planeada |
| 05 · Carritos | Carrito de invitado, cuenta y transferencia | Planeada |
| 06 · Stripe Checkout y pedidos | Compra, webhook firmado, pedidos e idempotencia | Planeada |
| 07 · Correo transaccional y PDF | Resend, mensajes de compra y detalle de pedido | Planeada |
| 08 · Staging | Railway, integraciones aisladas y aceptación de recorridos | Planeada |
| 09 · Validación previa a Producción | CI, recorridos de navegador, accesibilidad, rendimiento, seguridad y operación | Planeada |
| 10 · Producción | Dominio público, medios, costos, operación y salida autorizada | Planeada |

## Secuencia

```mermaid
flowchart TB
    p00["▫️ 00 · Creación y configuración del repositorio<br/>Planeada"] --> p01
    p01["▫️ 01 · Entorno local y Docker<br/>Planeada"] --> p02["▫️ 02 · Alcance y arquitectura<br/>Planeada"]
    p02 --> p03["▫️ 03 · Landing, catálogo y medios<br/>Planeada"]
    p03 --> p04["▫️ 04 · Cuentas y perfil<br/>Planeada"]
    p04 --> p05["▫️ 05 · Carritos<br/>Planeada"]
    p05 --> p06["▫️ 06 · Stripe Checkout y pedidos<br/>Planeada"]
    p06 --> p07["▫️ 07 · Correo transaccional y PDF<br/>Planeada"]
    p07 --> p08["▫️ 08 · Staging<br/>Planeada"]
    p08 --> p09["▫️ 09 · Validación previa a Producción<br/>Planeada"]
    p09 --> p10["▫️ 10 · Producción<br/>Planeada"]
```

## Plan por fases

### 00. Creación y configuración del repositorio — planeada

- **Objetivo:** crear `sadamlg/sr_del_mictlan` en GitHub y su copia local, con documentación y configuración inicial del proyecto.
- **Dependencias:** acceso autorizado a la cuenta `sadamlg`; comprobar que el nombre esté disponible y revisar la configuración existente antes de reproducirla. La visibilidad, permisos y opciones deben comprobarse en GitHub, no suponerse.
- **Resultado:** repositorio identificado, ramas `develop` y `main`, `develop` como predeterminada, eliminación automática de ramas fusionadas y documentación aprobada. Preparar `.gitignore`, excluir secretos, datos personales y artefactos; inventariar imágenes, fuentes, licencias y autorización de uso.
- **Comprobaciones:** confirmar propietario, nombre, visibilidad, acceso, ramas, opciones habilitadas y enlaces de documentación; registrar decisiones y limitaciones de la cuenta. El CI mínimo se implementa y verifica en la fase 01, cuando existan frontend, backend y sus lockfiles.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### Cuándo se definen los contratos

La fase 02 aprueba el alcance maestro del MVP, la arquitectura transversal, las interfaces compartidas y la secuencia de dependencias. **No cierra por adelantado el comportamiento detallado de cada módulo.** Al iniciar cada fase funcional, se revisa y ajusta su contrato antes de implementar; el contrato guía su alcance y comprobaciones. Los documentos en <code>docs/contracts</code> describen el comportamiento previsto, no acreditan que ya esté implementado o validado. Las fases 03–07 enlazan el contrato correspondiente. Las fases de infraestructura, como Staging y Producción, actualizan las guías de proveedor que les corresponden.

### 01. Entorno local y Docker — planeada

- **Objetivo:** permitir que una copia limpia del repositorio levante el stack de desarrollo y sus dependencias sin instalar Node.js en el equipo anfitrión.
- **Dependencias:** fase 00 completada.
- **Resultado:** frontend Next.js, API Express, PostgreSQL, Prisma, worker y Mailpit en Docker Compose. El modo local estándar enlaza servicios al loopback; el modo LAN es opcional y reversible y cambia la publicación de puertos y las direcciones usadas por el navegador. Los medios pueden servirse localmente o desde R2 sin cambiar los puertos de Compose.
- **CI del proyecto:** en esta fase crear y verificar un workflow mínimo con lint de frontend y backend; incorporar pruebas y build cuando existan durante las fases funcionales. La fase 09 añade la validación integral en Staging. El flujo y la protección de ramas se detallan en [Calidad y salida](quality/QUALITY-AND-RELEASE.md#evolución-del-ci).
- **Comprobaciones:** reconstruir y levantar Compose desde la guía; comprobar frontend, API, base de datos, worker y recepción de correo en Mailpit. Si se usa LAN, confirmar acceso desde otro dispositivo y poder volver al modo local. La guía distingue estos modos de los Dockerfiles de producción que se preparan en la fase 08.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 02. Alcance y arquitectura — planeada

- **Objetivo:** aprobar el alcance maestro del MVP y definir la arquitectura transversal: cómo se comunican navegador, frontend, API y servicios externos antes de construir los módulos.
- **Dependencias:** fase 01.
- **Resultado:** alcance maestro en [MVP_SCOPE.md](MVP_SCOPE.md), reglas duraderas en [AGENTS.md](../AGENTS.md), decisiones transversales de arquitectura y secuencia de dependencias. En producción, el navegador llama al proxy del mismo origen del frontend (<code>/api/backend/*</code>); Next.js reenvía la solicitud a Express por la red privada de Railway. Así la cookie de sesión pertenece al origen de la tienda. La API conserva un dominio público para el webhook de Stripe. En Compose, el navegador puede llamar a la API por el puerto local publicado. El comportamiento detallado de cada módulo se define o ajusta en su fase, antes de implementar ese módulo.
- **Motivo y momento de validación:** las pruebas de sesión entre dominios y en navegadores móviles hicieron visible la necesidad del proxy. Por eso la arquitectura se especifica aquí como dependencia de las cuentas y se valida al desplegar en la fase 08; Railway no exige el proxy para la comunicación privada entre servicios.
- **Comprobaciones:** <code>MVP_SCOPE.md</code>, diagramas y README describen la arquitectura de producción vigente; las guías separan las rutas locales y de producción; la API privada del navegador no se presenta como pública; cada fase funcional enlaza y revisa su contrato antes de implementar.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 03. Landing, catálogo y medios — planeada

- **Objetivo:** implementar la landing, el catálogo y los medios dentro del alcance aprobado.
- **Dependencias:** fases 01 y 02. Antes de cargar medios reales, el responsable del proyecto prepara la cuenta y el bucket no productivo de Cloudflare R2.
- **Contrato del módulo:** revisar y cerrar [Landing completa](contracts/03-LANDING.md), que reúne catálogo y contador de visitas, antes de implementar esas capacidades.
- **Resultado:** landing, tres fichas locales de catálogo, contador de visitas, aviso de edad e imágenes con claves estables. Desarrollo puede servir los archivos localmente o desde R2; staging usa medios no productivos; producción tendrá bucket y hostname propios. `r2.dev` se reserva para desarrollo/staging y no requiere cambiar DNS. La carga del MVP es manual; la aplicación no recibe credenciales de escritura. Cada entorno necesita sus migraciones; el catálogo de demostración se carga manualmente con `backend/prisma/dev-showcase.sql`.
- **Entrega y optimización de imágenes (estado comprobado):** R2 conserva los originales PNG y la carga del MVP es manual; R2 no convierte ni redimensiona objetos. En staging/producción, los componentes que usan <code>next/image</code> pasan por el optimizador de Next.js: <code>sizes</code> permite generar anchos responsivos y Next entrega WebP cuando el navegador lo acepta. Esto sucede en el servicio Frontend y no crea variantes dentro del bucket. El hero y el fondo de la colección usan <code>&lt;picture&gt;/&lt;img&gt;</code> y descargan el PNG original directamente; no se optimizan con Next. Por eso no se debe afirmar que las doce imágenes actuales tienen el mismo tratamiento. La elección de WebP/AVIF previo a la carga y de transformaciones de Cloudflare sigue pendiente. La guía de [R2](architecture/services/R2.md) distingue lo implementado de esa decisión pendiente.
- **Precios del catálogo:** los importes de <code>dev-showcase.sql</code> y del ejemplo aislado de staging son los valores correctos del alcance MVP y sirven para pruebas locales y de staging. “Pendientes de aprobación” significa que el cliente aún debe confirmar los precios comerciales finales antes de habilitar ventas en producción; no significa que los precios actuales sean incorrectos para el MVP.
- **R2 y entrega pública:** revisar cuotas antes de subir más medios. La URL <code>r2.dev</code> sirve para desarrollo/staging, pero no proporciona la caché CDN; producción requiere un dominio personalizado. La guía R2 explica cuotas y alertas. La decisión de activar optimización de Cloudflare Images es independiente y sigue pendiente; no se habilita ni se contabiliza como parte de la ruta actual.

- **Presentación y entrega:** las animaciones de interfaz se resuelven con CSS donde corresponde y respetan `prefers-reduced-motion`; no se depende de archivos animados pesados si una animación CSS cubre el caso. El catálogo público usa la estrategia de renderizado, caché y metadatos descrita en [RENDERING-AND-SEO.md](architecture/RENDERING-AND-SEO.md); las rutas privadas no deben servirse desde caché pública. Stripe necesita imágenes públicas HTTPS al crear Checkout, mediante `STRIPE_MEDIA_BASE_URL` del entorno.
- **Comprobaciones:** la landing y los productos activos se muestran; las claves y metadatos resuelven el medio correcto en cada entorno; se comprueba qué imágenes usan el optimizador de Next y cuáles entregan el PNG original; no se declara optimizado un medio que evite ese optimizador; el aviso de edad funciona; la interfaz respeta movimiento reducido; se comprueba que el proveedor de pago pueda obtener las imágenes cuando se usa Checkout remoto.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 04. Cuentas y perfil — planeada

- **Objetivo:** ofrecer registro, autenticación, recuperación y administración del perfil.
- **Dependencias:** fases 01 y 02; las pantallas se integran con las superficies definidas en fase 03.
- **Contrato del módulo:** revisar y cerrar [Cuentas y perfil](contracts/04-ACCOUNTS-PROFILE.md) antes de implementar registro, sesión y perfil.
- **Resultado:** registro con validación de mayoría de edad y dirección; confirmación de correo; inicio, cierre y restauración de sesión; recuperación de contraseña; edición de nombre(s), apellidos, correo, fecha de nacimiento y dirección; perfil y Mis pedidos, conectado a órdenes reales en la fase 06. Los datos de cuenta se guardan en PostgreSQL. Las cuentas nuevas permanecen pendientes hasta consumir el enlace; un cambio de correo sólo se aplica tras confirmar el nuevo destino. Confirmar puede iniciar sesión y, si la persona venía de comprar, retomar el carrito y el resumen de compra.
- **Correo local:** probar mensajes de cuenta con el worker y Mailpit en Compose. El envío desde un dominio real se prepara en la fase 07; no se requiere Resend para desarrollar las cuentas localmente.
- **Sesión y estados de interfaz:** producción usa el proxy del frontend definido en fase 02 para conservar la cookie bajo el origen de la tienda. Comprobar confirmación e inicio desde otro dispositivo; no asumir que confirmar correo en un dispositivo inicia sesión en otro. Si se abandona la vista de revisión de correo y se vuelve al login, la interfaz debe reflejar el estado real de la cuenta y permitir iniciar sesión después de confirmarla, sin conservar un mensaje de registro obsoleto.
- **Comprobaciones:** registro pendiente y confirmado, login, restauración, recuperación, cambio de correo confirmado, validaciones del backend, estados de carga/error/sesión vencida y privacidad de contraseñas y tokens. En Compose verificar los mensajes en Mailpit.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 05. Carritos — planeada

- **Objetivo:** permitir preparar una compra como invitado o con cuenta y fusionar ambos carritos al iniciar sesión.
- **Dependencias:** fases 03 y 04.
- **Contrato del módulo:** revisar y cerrar [Carritos](contracts/05-CARTS.md) antes de implementar el carrito persistente y la fusión de carritos. La integración del pago con Stripe se especifica en el contrato de la fase 06.
- **Resultado:** carrito de invitado persistido en el navegador por 30 días y carrito de cuenta en PostgreSQL. La transferencia suma cantidades de forma idempotente; el backend calcula precios actuales. Los productos inactivos se pueden quitar, pero no comprar. No se reservan ni verifican existencias.
- **Sincronización con Checkout:** al confirmar un pago, el webhook elimina sólo las líneas que coinciden con la instantánea comprada. Si la persona cambia el carrito mientras Stripe Checkout está abierto, esos cambios se conservan. Esta dependencia se implementa y valida junto al flujo de pago de la fase 06.
- **Comprobaciones:** reintentar la fusión no duplica cantidades, un error conserva el carrito local, se muestra un único carrito y Checkout rechaza productos inactivos o precios inválidos.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 06. Stripe Checkout y pedidos — planeada

- **Objetivo:** aceptar pagos alojados por Stripe y confirmar las compras sólo mediante webhooks firmados.
- **Dependencias:** fases 03, 04 y 05.
- **Contrato del módulo:** revisar y cerrar [Checkout y pedidos](contracts/06-CHECKOUT-ORDERS.md) antes de implementar pagos, webhooks y órdenes.
- **Stripe local:** primero probar en modo de prueba desde Compose con Stripe CLI y un túnel hacia el endpoint local. Reenviar sólo los eventos que procesa la aplicación y usar el `whsec_…` entregado por esa sesión local. Las instrucciones y el comando vigente están en [Stripe](architecture/services/STRIPE.md).
- **Resultado:** el servidor vuelve a validar disponibilidad y precios, crea una instantánea pendiente y abre Stripe Checkout. El webhook firmado confirma pagos, guarda la orden histórica y limpia las líneas compradas de forma idempotente. Sólo se muestran pedidos pagados a su titular. El resumen permite cambiar el destinatario sin alterar el perfil, consultar datos seguros de tarjetas guardadas y volver a pedir. No se almacena el número completo ni el CVC de la tarjeta.
- **Stripe en staging:** al desplegar en la fase 08, crear en el dashboard de Stripe un webhook HTTPS dirigido al dominio público de la API y `/api/webhooks/stripe`. Configurar los eventos documentados y guardar su secreto `whsec_…` en el backend de staging. Las claves y secretos de staging no se comparten con el túnel ni con producción.
- **Comprobaciones:** precios y disponibilidad vigentes, firma válida e inválida, eventos repetidos, estado pagado determinado por webhook y no por el retorno del navegador, orden visible en Mis pedidos y limpieza del carrito sin perder ediciones realizadas durante Checkout.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 07. Correo transaccional y PDF — planeada

- **Objetivo:** entregar mensajes de cuenta y una confirmación de compra con un único PDF de detalle del pedido.
- **Dependencias:** fase 04 para mensajes de cuenta y fase 06 para pedidos pagados. Antes de habilitar envíos desde un dominio propio, el responsable del proyecto crea la cuenta de Resend y prepara el dominio de envío en el DNS autoritativo de Neubox/cPanel.
- **Contrato del módulo:** precisar el correo de cuenta en [Cuentas y perfil](contracts/04-ACCOUNTS-PROFILE.md) y el correo de compra/PDF en [Checkout y pedidos](contracts/06-CHECKOUT-ORDERS.md#correo-de-compra-y-comprobantes) antes de implementar su entrega. La integración y los límites del proveedor se documentan en la guía [Resend](architecture/services/RESEND.md).
- **07.1 · Verificar el flujo local:** probar registro, recuperación y compra desde Compose; Mailpit debe recibir tanto correo de cuenta como de compra y el correo de compra debe incluir el PDF. Confirmar reintentos, tratamiento de fallos e idempotencia sin depender de un proveedor remoto.
- **07.2 · Preparar dominio y remitentes:** añadir en el Zone Editor los registros exactos que muestre Resend para el dominio elegido (`mail.srmictlan.com` en esta instalación), comprobar la verificación y preservar los MX y registros de otros servicios. No usar la sección de child nameservers para crear TXT/CNAME/MX ni cambiar toda la delegación DNS para verificar un registro. La guía de [Neubox y cPanel](architecture/services/NEUBOX.md) explica la zona autoritativa.
- **07.3 · Revisar capacidad de envío:** el plan Free vigente de Resend incluye hasta 3,000 correos al mes y 100 al día, sin requerir datos de facturación. La ausencia de solicitud de tarjeta es compatible con ese plan; se debe confirmar el plan actual en la cuenta, no inferirlo sólo por el formulario de alta. Confirmación, recuperación y compras comparten esos límites. En planes pagados, los sobreconsumos transaccionales se habilitan aparte y se cobran en bloques de 1,000 usando la tarjeta registrada. No habilitar sobreconsumos ni introducir una tarjeta sin presupuesto aprobado. La [guía de Resend](architecture/services/RESEND.md) explica la comprobación y el comportamiento vigente.

- **Resultado:** PostgreSQL persiste un solo trabajo de confirmación por pedido pagado y el worker lo procesa. En Compose el worker usa SMTP hacia Mailpit; en Railway usa la API HTTPS de Resend. La clave pertenece al Worker y se separa por entorno. `MAIL_FROM` se usa para mensajes de cuenta y `RESEND_FROM` para compras; verificar envío no crea por sí mismo un buzón para recibir respuestas. No se añade otro broker a la cola persistida. El worker registra tipo de trabajo, intento e error sin volcar destinatarios, domicilios ni contenido del mensaje.
- **Comprobaciones:** dominio verificado, remitentes autorizados, enlaces con el origen del entorno correcto, mensaje visible en Resend y en la bandeja destino, PDF con el detalle correcto y trabajo recuperable ante fallos. No guardar claves en el repo ni configurarlas como `SMTP_PASSWORD`.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 08. Staging — planeada

- **Objetivo:** desplegar y aceptar la aplicación en servicios no productivos que reproduzcan la arquitectura de producción.
- **Dependencias:** fases 01–07; cuenta Railway del responsable del proyecto, PostgreSQL de staging, Dockerfiles de producción, bucket de medios no productivo, claves de Stripe de prueba y configuración de Worker/Resend de staging. El responsable crea un widget Turnstile de staging y autoriza el hostname público del frontend antes de añadir sus claves a Railway; no requiere migrar DNS ni activar un proxy Cloudflare. Confirmar que los Dockerfiles estén versionados antes de crear los servicios.
- **08.1 · Crear servicios Railway:** configurar `postgres`, `api`, `worker` y `frontend` por separado. Usar `backend/Dockerfile.production` para API y Worker y `frontend/Dockerfile.production` para Next.js; ejecutar migraciones desde el servicio API. La guía indica raíz, comandos, health check, red privada y variables. `INTERNAL_API_URL` permite que Next.js use la URL privada de la API; su dominio público recibe el webhook. No desplegar Mailpit.
- **08.2 · Aislar proveedores y medios:** cada servicio conserva variables y secretos propios de staging. Usar webhook HTTPS de Stripe con su propio secreto, bucket/hostname no productivo y remitentes de Resend verificados. Los dominios públicos de Railway bastan para iniciar; Cloudflare DNS/TLS para un dominio de staging sólo se configura si ese dominio está disponible y se necesita.
- **08.3 · Revisar el consumo de Railway:** inspeccionar el control de uso a nivel del workspace y dejar documentado si existen alerta suave y límite duro. El umbral se decide según presupuesto aprobado; no asignarlo por intuición. El límite duro puede apagar todos los workloads del workspace. La [guía Railway](architecture/services/RAILWAY.md) describe el alcance y el comando de consulta.
- **08.4 · Completar controles del MVP:** verificar Turnstile en registro e inicio de sesión, validación Siteverify de token, hostname y acción, y casos válidos e inválidos. Configurar claves y hostname propios según [Cloudflare](architecture/services/CLOUDFLARE.md) y [Railway](architecture/services/RAILWAY.md#turnstile-de-staging).
- **Comprobaciones de recorrido completo:** desde móvil y escritorio, registrar, recibir y consumir confirmación, iniciar sesión, recuperar contraseña, consultar catálogo/imágenes, preparar carrito, pagar con Stripe de prueba, confirmar por webhook, comprobar que se limpia sólo lo comprado y recibir el correo con PDF. Revisar también errores de consola y solicitudes; una prueba de compra aislada no acredita todos estos recorridos.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 09. Validación previa a Producción — planeada para el proyecto

- **Objetivo:** obtener evidencia reproducible de calidad funcional, accesibilidad, rendimiento, seguridad y recuperación del candidato antes de abrir Producción.
- **Dependencias:** reconstrucción verificada de las fases 01–08 en el proyecto; CI básico preparado desde el inicio; Staging desplegado con commit identificable y proveedores de prueba. El responsable prepara antes de las pruebas cuentas/bandejas de prueba, acceso administrativo a GitHub/Railway y recursos aislados de PostgreSQL, Stripe, Resend y Cloudflare. Revisar cuotas y presupuesto antes de activar servicios adicionales.
- **Resultado:** suites de Playwright y axe, informes Lighthouse y ZAP Baseline, revisión de seguridad, checks de GitHub Actions y evidencia de restauración/rollback. Las herramientas se ejecutan desde el equipo o runners temporales; Playwright no requiere un servicio permanente en Compose. La [guía de calidad y salida](quality/QUALITY-AND-RELEASE.md) define el paquete obligatorio, complementos opcionales, orden y fuentes.
- **Comprobaciones:** lint, pruebas y build aprobados; recorridos críticos reales de Staging documentados; accesibilidad automática y manual revisada; mediciones de rendimiento y SEO guardadas con objetivos acordados; hallazgos altos/críticos confirmados resueltos; restauración, alertas y rollback comprobados. Asociar resultados al mismo candidato y distinguir simulaciones, omisiones y bloqueos. Registrar responsable y aceptación antes de avanzar a la fase 10.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.

### 10. Producción — planeada

- **Objetivo:** preparar el entorno real, su dominio público, operación y costos antes de autorizar la salida.
- **Dependencias:** aceptación de staging y cierre de la fase 09 en el proyecto, cuenta y recursos de producción, dominio disponible y preparación por el responsable del proyecto de credenciales distintas para Stripe, Resend, Railway y R2.
- **10.1 · Preparar Railway y medios:** crear servicios y PostgreSQL separados de staging, aplicar migraciones, verificar catálogo, configurar Worker/Resend, claves de Stripe live y bucket de producción. Confirmar con el cliente los precios comerciales finales antes de habilitar cobros reales; los precios actuales del MVP sólo autorizan pruebas. La URL de medios debe ser pública y HTTPS para Stripe; no usar <code>r2.dev</code> en producción.
- **10.2 · Decidir la capa pública de Cloudflare:** decidir si Cloudflare administrará DNS, proxy/CDN y el hostname personalizado de medios. R2 y la zona DNS son recursos distintos: usar R2 en desarrollo o staging no requiere cambiar nameservers. Si se migra la zona, inventariar y conservar antes los registros web, MX, SPF, DKIM, DMARC y verificaciones; cambiar la delegación desde Neubox afecta toda la zona. Probar TLS, tienda, webhook, imágenes y políticas de caché antes de habilitar el tráfico. Seguir [Neubox](architecture/services/NEUBOX.md), [Cloudflare](architecture/services/CLOUDFLARE.md) y [R2](architecture/services/R2.md).
- **10.3 · Revisar cuotas, límites y costos antes de habilitar tráfico:**
  - **R2:** contrastar almacenamiento y operaciones con la cuota Standard vigente; el egreso de R2 es gratuito. La alerta de presupuesto de Cloudflare es a nivel de cuenta y sólo notifica: no detiene el consumo ni fija un máximo para R2.
  - **Cloudflare Images, sólo si se elige:** sus transformaciones son un producto separado de R2/CDN. El plan Free permite 5,000 transformaciones únicas al mes; al excederlas, las transformaciones nuevas pueden fallar. No está configurado en este proyecto.
  - **Railway:** revisar los límites del workspace. La alerta suave envía correo; el límite duro de cómputo apaga todos los workloads del workspace al alcanzarse. Seleccionar ambos importes con el presupuesto aprobado y considerar que Staging y Production comparten el efecto si están en el mismo workspace.
  - **Resend:** comparar el volumen diario y mensual de confirmación, recuperación y compras con el plan de la cuenta. Free no requiere tarjeta y limita el envío a 3,000/mes y 100/día; el sobreconsumo sólo existe como opción en planes pagados y puede generar cargos automáticos.
  - **Stripe:** el modo de prueba no procesa pagos reales. En Standard, Stripe cobra por transacción exitosa; los límites de solicitudes API limitan la tasa de llamadas, no el gasto o las ventas. No hay un tope de gasto configurado por esta integración. Si el negocio necesita un límite de ventas, debe definirse como regla del negocio antes de producción.
  - Registrar los umbrales y el responsable sólo después de revisar los paneles actuales y aprobar un presupuesto. La tabla y los enlaces oficiales están en [Servicios y costos](architecture/services/COSTS.md); cada guía de proveedor contiene sus controles.

- **10.4 · Preparar operación y salida:** configurar copias de seguridad y comprobar recuperación, monitoreo, responsables de secretos, respuesta a fallos y procedimiento de rollback. Completar dominio canónico, metadatos, `robots.txt` y `sitemap.xml` antes de abrir el sitio a indexación, según [RENDERING-AND-SEO.md](architecture/RENDERING-AND-SEO.md).
- **Comprobaciones:** repetir en producción las integraciones críticas con las credenciales y recursos de ese entorno; verificar correo, imágenes y enlaces bajo dominio final; revisar restauración y costos; obtener autorización explícita antes de habilitar ventas.
- **Estado y evidencia:** planeada; registrar pruebas, entorno, fecha y commit al completar la fase.
