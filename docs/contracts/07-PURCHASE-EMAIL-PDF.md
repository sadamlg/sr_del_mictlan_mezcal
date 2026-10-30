# Contrato de correo de compra y PDF · fase 07

Al confirmar el pago, la misma transacción que cambia el pedido a `PAID` crea un trabajo `PURCHASE_CONFIRMATION`. `email_jobs.order_id` es único; un webhook repetido no crea otro trabajo ni elimina el carrito otra vez. El worker carga el pedido y sus líneas históricas y dirige el mensaje a `recipientEmail` de la compra, que puede diferir del correo del perfil.

El correo de confirmación incluye un único PDF de **detalle del pedido**, generado desde esa instantánea. Reúne la referencia, fechas del pedido y pago, destinatario, dirección de envío, productos, subtotal y total pagado. No es un documento fiscal.

Los errores de envío usan la cola existente: hasta cinco intentos, reintento de trabajos `PROCESSING` abandonados después de dos minutos y esperas crecientes de 2, 4, 8 y 16 segundos entre intentos. Un fallo definitivo deja el trabajo en `FAILED`. El worker registra el ID del trabajo, tipo, intento y código de error; no escribe destinatarios, domicilios ni contenido del mensaje en logs. Resend recibe una clave estable `purchase-confirmation/<orderId>` para deduplicar la solicitud dentro de su ventana documentada de 24 horas.

En Compose, Mailpit recibe tanto el correo de compra como los de cuenta. En Railway, el worker usa la API HTTPS de Resend. Los remitentes y la clave se configuran según la [guía de Resend](../resend.md).

Para envío y reintentos, consulta la documentación oficial de [Send Email](https://resend.com/docs/api-reference/emails/send-email), [Attachments](https://resend.com/docs/dashboard/emails/attachments) e [Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
