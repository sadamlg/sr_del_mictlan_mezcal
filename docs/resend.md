# Correo transaccional con Mailpit y Resend

La aplicación crea trabajos de correo en PostgreSQL y un worker los envía. En desarrollo (`NODE_ENV=development`), el worker usa SMTP hacia Mailpit para registro, recuperación, cambio de correo y compra con PDF. En Railway usa la API HTTPS de Resend para esos mismos trabajos; no necesita variables `SMTP_*` allí. Los contratos están en [cuentas](contracts/04-ACCOUNTS-PROFILE.md) y [correo de compra](contracts/07-PURCHASE-EMAIL-PDF.md).

## Probar primero sin proveedor externo

Levanta Compose según [Desarrollo local](development.md). Registra una cuenta y abre http://localhost:8025 para ver el enlace de confirmación. Después haz una compra de prueba con [Stripe](stripe.md) y comprueba en Mailpit el mensaje con un solo PDF de detalle del pedido. Si no aparece, revisa `docker compose logs --follow worker` y el estado del trabajo en la base antes de cambiar credenciales.

## Preparar un dominio de envío

1. Crea una cuenta de Resend y añade un dominio o subdominio que controles. En este proyecto se eligió `mail.srmictlan.com`; otra instalación debe usar su propio dominio.
2. Copia los registros DNS que Resend muestre para **ese** dominio y cuenta al editor de la zona autoritativa. La [guía de Neubox y cPanel](domain-neubox-cpanel.md) explica dónde hacerlo y cómo preservar el correo existente.
3. Espera a que Resend indique que la capacidad de envío del dominio está verificada. Si un registro falla, revisa su nombre final, tipo, valor y propagación; no cambies *nameservers* para corregir un TXT individual.
4. Define remitentes del dominio verificado: por ejemplo, `Señor del Mictlán <cuentas@mail.srmictlan.com>` para cuentas y `Señor del Mictlán <pedidos@mail.srmictlan.com>` para compras. Verificar un dominio permite enviar desde direcciones de ese dominio; recibir respuestas en esas direcciones requiere configurar por separado un buzón o reenvío. [Dominios verificados de Resend](https://resend.com/docs/dashboard/domains/introduction).

## Clave y variables del worker

Crea una API key con permiso de envío, limitada al dominio cuando Resend ofrezca esa opción. Guarda la clave en el gestor de variables del **worker** de Railway; Resend sólo la muestra al crearla. Usa claves distintas para staging y producción.

| Variable del worker | Procedencia | Uso |
|---|---|---|
| `RESEND_API_KEY` | API key de Resend del entorno | Autoriza las solicitudes HTTPS de envío. |
| `MAIL_FROM` | Dirección del dominio verificado | Remitente de registro, recuperación y cambio de correo. |
| `RESEND_FROM` | Dirección del dominio verificado | Remitente de compra y PDF; si falta, el código usa `MAIL_FROM`. |
| `APP_BASE_URL` | URL pública del frontend del entorno | Forma los enlaces de confirmación y recuperación. |
| `DATABASE_URL` | PostgreSQL de Railway | Permite leer y actualizar los trabajos. |
| `NODE_ENV` | `production` en Railway | Selecciona Resend en vez de Mailpit. |

La API crea los trabajos; el worker envía. No pegues la clave en el README, `.env.example`, el frontend ni el servicio API. Tampoco configures `SMTP_PASSWORD` con la API key: este proyecto usa la API HTTPS de Resend fuera de desarrollo.

## Comprobar entrega y diagnosticar

1. En staging, registra una cuenta usando un buzón al que tengas acceso. Comprueba que el worker procese el trabajo, que Resend muestre el mensaje y que el enlace apunte al frontend de staging.
2. Confirma la cuenta y entra desde otro dispositivo; comprueba también recuperación de contraseña.
3. Haz una compra de prueba y comprueba el correo con el PDF único. Revisa destinatario, remitente y datos del pedido. La recepción en la bandeja final confirma más que la sola aceptación por la API.
4. Revisa las cuotas del plan vigente en [Servicios y costos](servicios-y-costos.md). Registro, recuperación y compra comparten la capacidad diaria del mismo proveedor; vigila los rechazos y el estado de la cola antes de aumentar tráfico.

| Síntoma | Primer lugar para revisar |
|---|---|
| No aparece intento en Resend | Worker, `DATABASE_URL`, trabajos pendientes y `RESEND_API_KEY`. |
| Resend rechaza el remitente | Verificación del dominio y coincidencia de `MAIL_FROM`/`RESEND_FROM`. |
| El correo llega con un enlace equivocado | `APP_BASE_URL` del worker del entorno. |
| La API de Resend acepta, pero no llega a la bandeja | Estado del mensaje en Resend y carpeta de spam del destinatario. |
| Llegó la compra, pero no el PDF | Trabajo de compra, generación del adjunto y logs del worker. |

Los trabajos de compra usan una clave de idempotencia y reintentos según el [contrato de la fase 07](contracts/07-PURCHASE-EMAIL-PDF.md). Consulta la [API de envío](https://resend.com/docs/api-reference/emails/send-email) y las [claves de idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys) para el comportamiento del proveedor.
