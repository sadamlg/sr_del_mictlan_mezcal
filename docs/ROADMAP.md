# Roadmap

Estado de implementación del [MVP aprobado](MVP_SCOPE.md). Las decisiones duraderas de desarrollo están en [AGENTS.md](../AGENTS.md); este roadmap evita repetirlas.

| Fase | Resultado | Estado |
|---|---|---|
| 01 · Stack y entorno local | Next.js, Express, PostgreSQL, Prisma, worker y Compose | Concluida |
| 02 · Alcance y plan | Contratos funcionales y arquitectura | Concluida |
| 03 · Landing, catálogo y medios | Landing, contador, aviso de edad e imágenes en R2 | Concluida |
| 04 · Cuentas y perfil | Registro, correo, sesión, perfil y seguridad | Concluida |
| 05 · Carritos | Persistencia, carrito invitado y transferencia | Concluida |
| 06 · Stripe Checkout y pedidos | Pago alojado, webhook firmado e historial | Concluida |
| 07 · Correo de compra y PDF | Resend y dos comprobantes PDF por compra pagada | Siguiente |
| 08 · Integración en staging | Configuración no productiva, aceptación y Turnstile | Planeada |
| 09 · Preparación de producción | Servicios, medios, operación y salida autorizada | Planeada |

## Estado actual

- La landing, las tres fichas del catálogo local y los doce medios públicos de desarrollo están implementados. La base de datos de cada entorno debe tener sus migraciones aplicadas; el catálogo de demostración se carga manualmente con `backend/prisma/dev-showcase.sql`.
- Cuentas, confirmación de correo, cambio de contraseña, perfil y pedidos están conectados a PostgreSQL. En Compose, el worker envía correos de cuenta por SMTP a Mailpit.
- El carrito se puede usar como invitado o con cuenta. Al iniciar sesión se transfieren las cantidades sin duplicarlas.
- Stripe Checkout crea sesiones en el servidor. El backend confirma órdenes mediante webhook firmado e idempotente, conserva una instantánea de compra y sólo muestra pedidos pagados a su titular. La interfaz permite cambiar el destinatario de la compra sin modificar el perfil, consultar los datos seguros de tarjetas guardadas y volver a pedir desde el resumen.
- No están implementados Turnstile, los correos de confirmación de compra ni los PDF. Resend tampoco está conectado: la configuración actual de correo es SMTP.
- El repositorio no contiene configuración versionada de despliegue a Railway ni de DNS/TLS. No se puede inferir desde el código si staging o producción están publicados o configurados.

## Próximas fases

### 07. Correo de compra y PDF

Crear un trabajo persistido por pedido pagado, enviar por Resend una confirmación con el comprobante de pago y la copia de la orden, y definir reintentos y observabilidad sin duplicar correos ante eventos repetidos.

**Cierre:** contenido y dos PDF correctos, envío recuperable ante fallos y pruebas de los casos de éxito, reintento e idempotencia.

### 08. Integración en staging

Desplegar los servicios no productivos y configurar Stripe en modo de prueba, correo y medios aislados. Configurar Turnstile en registro e inicio de sesión, validando el token en servidor con Siteverify. Cloudflare DNS/TLS para un dominio de staging sólo se configura cuando ese dominio esté disponible.

**Cierre:** recorridos críticos aceptados en staging, incluidos tokens Turnstile válidos, ausentes e inválidos; secretos y datos separados de producción.

### 09. Preparación de producción

Preparar cuentas, secretos y recursos de producción, bucket y hostname de medios, dominios, TLS, copias de seguridad, monitoreo y procedimientos de recuperación. Consultar las tarifas vigentes antes de habilitar servicios de pago.

**Cierre:** procedimientos de operación y recuperación verificados, integraciones críticas validadas y autorización explícita antes de la salida efectiva.
