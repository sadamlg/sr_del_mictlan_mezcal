# Contrato de Checkout y pedidos

**Estado:** implementado y probado manualmente en staging con Stripe en modo de prueba el 29 de octubre de 2026. Producción sigue pendiente de preparación y validación.

## Recorrido de compra

1. El checkout requiere sesión. Una persona invitada pasa por inicio de sesión o registro; confirmar una cuenta nueva conserva la intención y vuelve al resumen de compra.
2. El resumen ordena sus secciones así: productos seleccionados editables con imágenes; datos de envío y contacto; tarjetas guardadas que Stripe permite volver a mostrar; total y acciones. Se pueden cambiar cantidades y editar destinatario para esa orden. Estos cambios no modifican el perfil.
3. Al confirmar, la API crea una orden pendiente desde el carrito y precios actuales del servidor, y abre Stripe Checkout alojado.
4. Stripe devuelve al usuario a la tienda con el ID de la sesión. La página consulta su estado hasta que el webhook firmado confirma el pago; entonces recarga el carrito y “Mis pedidos”. “Volver a pedir” repone los artículos y abre directamente el resumen.

No hay reserva ni comprobación de existencias. La aplicación no almacena PAN, CVC ni IDs de métodos de pago. Stripe puede guardar una tarjeta cuando el comprador da su consentimiento; el resumen sólo muestra marca, últimos cuatro y vencimiento, además del titular si Stripe lo devuelve.

## API y seguridad

| Método y ruta | Acceso | Uso |
|---|---|---|
| `GET /api/checkout/payment-methods` | Sesión | Devuelve `{ "cards": [] }` si no hay Customer asociado; si hay tarjetas, sólo incluye los datos que se pueden mostrar. |
| `GET /api/checkout/return-status?session_id=...` | Sesión | Devuelve el estado de la sesión de Checkout asociada a esa cuenta; las sesiones de otra cuenta responden `NOT_FOUND`. |
| `POST /api/checkout/sessions` | Sesión | Crea una sesión desde el carrito persistido y devuelve `checkoutUrl`. Acepta opcionalmente el destinatario de esta compra. |
| `POST /api/webhooks/stripe` | Firma Stripe | Procesa eventos recibidos con cuerpo crudo y `Stripe-Signature` válida. |
| `GET /api/orders` | Sesión | Devuelve sólo pedidos pagados del titular, con importes y líneas históricas. |

El backend deriva la cuenta de la sesión; ignora precios, totales e identidad enviados por el navegador. Antes de crear Checkout vuelve a consultar productos activos y precios. Si el carrito está vacío responde `409 CART_EMPTY`; si un artículo no está disponible, `409 PRODUCT_NOT_AVAILABLE`; un fallo de proveedor o almacenamiento responde `503 CHECKOUT_UNAVAILABLE` sin filtrar detalles internos.

El webhook sólo acepta eventos de pago completado con `payment_status=paid` y valida modo, moneda, sesión vinculada, referencia interna y total. Firma ausente o inválida responde `400`. La transición a pagado es idempotente: eventos repetidos no crean otro pedido ni repiten efectos. Errores de persistencia responden de forma que Stripe pueda reintentar. Eventos vencidos o fallidos cierran intentos pendientes, pero no aparecen en el historial.

## Datos que conserva el pedido

Cada intento conserva una instantánea de destinatario, dirección, productos, cantidades y precios. Las órdenes son independientes de las fichas vigentes del catálogo; el historial no cambia si después se edita o desactiva un producto.

Al confirmar un pago, la misma transacción marca el pedido como pagado y elimina del carrito sólo las líneas que siguen coincidiendo con la instantánea de Checkout. Si la persona cambia cantidades o recrea una línea mientras está en Stripe, esos cambios se conservan. La operación es idempotente.

`GET /api/orders` responde `200` con `orders: []` si no hay compras. Pedidos pendientes, vencidos o fallidos no se muestran. El regreso del navegador puede informar que el pago está pendiente; no cambia el estado del pedido.

Ejemplo reducido de pedido:

```json
{
  "id": "uuid",
  "status": "PAID",
  "createdAt": "2026-10-28T21:00:00.000Z",
  "paidAt": "2026-10-28T21:02:00.000Z",
  "total": { "amount": 24690, "currency": "MXN" },
  "items": [{
    "slug": "mezcal-reposado",
    "name": "Mezcal Reposado",
    "quantity": 2,
    "unitPrice": { "amount": 12345, "currency": "MXN" },
    "lineTotal": { "amount": 24690, "currency": "MXN" }
  }]
}
```

Los montos están en centavos de MXN. Los ejemplos no son precios comerciales.

## Comportamiento detallado recuperado

### Crear Checkout

- `POST /api/checkout/sessions` requiere la cookie de sesión válida y el origen frontend configurado. La cuenta se determina sólo desde la sesión; no acepta precios, importes, cuenta, productos ni cantidades del navegador. Puede recibir `recipient` con el nombre, correo y dirección del destinatario de ese pedido. Si se omite, usa los datos del perfil de la cuenta.
- `GET /api/checkout/payment-methods` requiere sesión y consulta sólo el Customer de Stripe vinculado a esa cuenta. Devuelve tarjetas con consentimiento `allow_redisplay=always` como marca, últimos cuatro dígitos y vencimiento; incluye `cardholderName` sólo cuando Stripe proporciona `billing_details.name`. No expone IDs de PaymentMethod, fingerprint, número completo ni CVC. Si la cuenta no tiene Customer, devuelve una lista vacía.
- El backend obtiene el carrito persistido de esa cuenta y vuelve a consultar los productos activos con sus nombres y precios actuales. No usa los precios que muestra el carrito ni los del cuerpo de la petición.
- El carrito vacío responde `409 CART_EMPTY`. Si contiene al menos un producto eliminado, inactivo o sin precio vigente, no se crea sesión y responde `409 PRODUCT_NOT_AVAILABLE`; no se cobra parcialmente.
- Se crea una instantánea pendiente del pedido, sus datos del destinatario y sus líneas antes de llamar a Stripe. Cada línea conserva slug, nombre, cantidad, precio unitario en centavos MXN y subtotal; el pedido conserva nombre, correo y dirección de envío, moneda, subtotal y total. Los datos del destinatario pertenecen sólo al pedido y no actualizan el perfil ni el Customer de Stripe. Así el webhook puede confirmar el registro histórico sin reconstruir los datos de compra después del pago.
- La sesión de Stripe usa modo `payment`, moneda MXN y `price_data` generado desde esa instantánea. Incluye el ID interno del pedido como referencia y metadato, y el email/nombre de la cuenta para precargar el Checkout. Nunca envía datos de tarjeta a la API de la tienda.
- El backend guarda el ID de la sesión y responde `{ "checkoutUrl": "https://checkout.stripe.com/..." }`. La UI navega a esa URL. Si Stripe o la persistencia fallan, responde `503 CHECKOUT_UNAVAILABLE` con un mensaje genérico; no filtra el error del proveedor.
- Si el frontend repite la solicitud, cada sesión válida representa un intento de compra separado. Cada sesión pagada produce como máximo un pedido.

### Confirmar el pago

- `POST /api/webhooks/stripe` recibe el cuerpo crudo y verifica `Stripe-Signature` con `STRIPE_WEBHOOK_SECRET` antes de leer o cambiar datos. Un cuerpo alterado o una firma ausente/inválida responde `400` y no modifica pedidos.
- Sólo `checkout.session.completed` con `payment_status=paid` y `checkout.session.async_payment_succeeded` con `payment_status=paid` pueden marcar un pedido como pagado. El estado del navegador, `success_url` y `cancel_url` nunca confirman una compra.
- Antes de confirmar, se comprueban el modo `payment`, la referencia interna exacta, la sesión ya vinculada al pedido, la moneda MXN y que `amount_total` coincida con el total guardado. Si Stripe notifica antes de que termine de guardarse la sesión, se responde con error para que reintente; nunca se enlaza un pago a un pedido sólo por tener el mismo importe. El webhook no reserva ni consulta existencias.
- La transición pendiente → pagado y el borrado de las líneas compradas del carrito se hacen en una transacción. Cada línea de carrito tiene un token UUID nuevo al crearla y en toda edición o merge, aunque la cantidad ya esté topada en 99. Sólo se quita una línea si la cantidad y token siguen iguales a la instantánea; los cambios hechos mientras Stripe Checkout estaba abierto se conservan incluso si ocurren en el mismo milisegundo o si la fila se elimina y se vuelve a crear.
- La transición es idempotente: reintentos o eventos repetidos no crean otro pedido ni vuelven a borrar el carrito. Los eventos desconocidos se reconocen sin efectos. Un fallo de base de datos produce respuesta no exitosa para que Stripe pueda reintentar.
- Los eventos firmados `checkout.session.async_payment_failed` y `checkout.session.expired` pueden cerrar intentos pendientes; no crean pedidos pagados ni los muestran en el historial.

### Consultar “Mis pedidos”

- `GET /api/orders` requiere sesión, deriva el titular exclusivamente de la cookie y usa `Cache-Control: no-store`.
- Devuelve sólo pedidos pagados del titular, con las líneas y los importes históricos; no usa datos actuales del catálogo. Ordena de más reciente a más antiguo.
- Una cuenta sin compras responde `200` con `orders: []`. Una solicitud sin sesión responde `401`. El endpoint nunca permite consultar pedidos de otra cuenta.
- Los intentos pendientes, vencidos o fallidos no aparecen en “Mis pedidos”. El regreso del navegador puede mostrar un mensaje de espera, pero el historial sólo refleja el pedido después de procesar el webhook firmado.

## Contrato de datos y ejemplos

La migración añade `orders` y `order_items`. `orders` tiene titular, estado (`PENDING`, `PAID`, `FAILED`, `EXPIRED`), ID de sesión de Checkout único y opcional hasta que Stripe la devuelve, ID de PaymentIntent opcional, moneda, subtotal, total, marcas de tiempo de creación y pago. `order_items` conserva `productId` como referencia histórica no relacional para sincronizar el carrito, además de slug/nombre/precio/cantidad/subtotal de la compra, el `updatedAt` y el token UUID del artículo al iniciar Checkout. El UUID es el token de concurrencia y distingue también la recreación de una fila; los timestamps usan precisión de milisegundos para conservar el snapshot de PostgreSQL en JavaScript `Date`. Las líneas no dependen de que el producto siga existiendo.

La cuenta puede tener un `stripeCustomerId` único y opcional para reutilización de métodos guardados en Stripe tras consentimiento explícito. No se persisten números de tarjeta, CVC ni `PaymentMethod` IDs.

El resumen precarga los datos del destinatario desde el perfil, pero permite editar nombre, correo y dirección para el pedido actual. El backend valida el objeto `recipient` y guarda esos datos en `orders`; editar o guardar el destinatario no modifica la información personal de la cuenta. La cuenta sigue siendo la identidad autenticada y la referencia usada para vincular el Customer de Stripe.

El cuerpo opcional de `POST /api/checkout/sessions` usa esta forma:

```json
{
  "recipient": {
    "name": "Ana Mora",
    "email": "ana@example.test",
    "address": {
      "street": "Calle de prueba",
      "number": "1",
      "neighborhood": "Centro",
      "locality": "Morelia",
      "state": "Michoacán",
      "postalCode": "58000"
    }
  }
}
```

`GET /api/orders` devuelve:

```json
{
  "orders": [
    {
      "id": "uuid",
      "status": "PAID",
      "createdAt": "2026-10-28T21:00:00.000Z",
      "paidAt": "2026-10-28T21:02:00.000Z",
      "subtotal": { "amount": 24690, "currency": "MXN" },
      "total": { "amount": 24690, "currency": "MXN" },
      "items": [
        {
          "slug": "mezcal-reposado",
          "name": "Mezcal Reposado",
          "quantity": 2,
          "unitPrice": { "amount": 12345, "currency": "MXN" },
          "lineTotal": { "amount": 24690, "currency": "MXN" }
        }
      ]
    }
  ]
}
```

Los errores HTTP conservan `{ "error": { "code", "message" } }`, cabeceras privadas y los estados ya usados por la API de cuenta.


## Correo de compra y comprobantes

Al confirmar el pago, la misma transacción que cambia el pedido a `PAID` crea un trabajo `PURCHASE_CONFIRMATION`. `email_jobs.order_id` es único; un webhook repetido no crea otro trabajo ni elimina el carrito otra vez. El worker carga el pedido y sus líneas históricas y dirige el mensaje a `recipientEmail` de la compra, que puede diferir del correo del perfil.

El correo de confirmación incluye un único PDF de **detalle del pedido**, generado desde esa instantánea. Reúne la referencia, fechas del pedido y pago, destinatario, dirección de envío, productos, subtotal y total pagado. No es un documento fiscal.

Los errores de envío usan la cola existente: hasta cinco intentos, reintento de trabajos `PROCESSING` abandonados después de dos minutos y esperas crecientes de 2, 4, 8 y 16 segundos entre intentos. Un fallo definitivo deja el trabajo en `FAILED`. El worker registra el ID del trabajo, tipo, intento y código de error; no escribe destinatarios, domicilios ni contenido del mensaje en logs. Resend recibe una clave estable `purchase-confirmation/<orderId>` para deduplicar la solicitud dentro de su ventana documentada de 24 horas.

En Railway, el worker envía tanto los correos de cuenta como la confirmación de compra mediante la API de Resend. Necesita `RESEND_API_KEY` y remitentes autorizados en el dominio verificado; `RESEND_FROM` identifica los mensajes de compra y `MAIL_FROM` los mensajes de cuenta. En Compose, Mailpit recibe localmente tanto los correos de cuenta como los de compra por SMTP.

Para envío y reintentos, consulta la documentación oficial de [Send Email](https://resend.com/docs/api-reference/emails/send-email), [Attachments](https://resend.com/docs/dashboard/emails/attachments) e [Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

Para implementar o revisar Stripe, consulta la documentación oficial sobre [crear Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [fulfillment](https://docs.stripe.com/checkout/fulfillment), [webhooks](https://docs.stripe.com/webhooks) y [reutilizar métodos de pago con consentimiento](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted).

La [guía de Stripe del proyecto](../architecture/services/STRIPE.md) describe el listener local, los eventos, el endpoint de Railway y los problemas observados. La [guía de Resend](../architecture/services/RESEND.md) detalla el envío y diagnóstico del correo con PDF.

## Orden de implementación y pruebas de la fase 06

Este orden y los criterios inferiores se conservan como referencia del plan de la fase 06. Las casillas son los criterios originales, no el resultado de una ejecución de pruebas actual.

1. Añadir pruebas unitarias de servicio/handler para autenticación, carrito vacío, producto no disponible, precio vigente, sesión alojada construida sólo desde datos del backend, fallo de Stripe, firma inválida, confirmación pagada, total/moneda incorrectos, idempotencia y aislamiento de órdenes.
2. Observar fallar esas pruebas antes de implementar. Mantener `node:test`; no agregar un runner.
3. Implementar repositorio, servicio, handlers y rutas Express; aplicar migración Prisma y cubrir persistencia, transacciones y aislamiento con pruebas de base en Compose.
4. Probar el webhook HTTP con un cuerpo crudo y firma válida generada con la utilidad de prueba de Stripe. No requiere credenciales reales; la creación de sesiones se inyecta en pruebas. El Checkout real y el webhook con Stripe CLI también pueden verificarse en desarrollo local; en staging se usa el webhook público configurado en Stripe.
5. Implementar frontend con el contrato visual existente en `../DESIGN.md` y los patrones de cuenta y carrito: al proceder desde el carrito, cerrar el panel al pasar a autenticación, conservar la intención de compra después de iniciar sesión o confirmar una cuenta nueva, y mostrar un resumen con datos del titular y domicilio, tarjetas guardadas con consentimiento (sólo marca, últimos cuatro y vencimiento), imagen, productos, cantidades y total antes de iniciar Stripe. El resumen es informativo: Checkout alojado sigue gestionando la elección/entrada de la tarjeta y la aplicación no permite administrar métodos de pago. Incluir retorno informativo, estados de carga/error/vacío y pedidos reales del titular. La vuelta del navegador no marca pedidos como pagados.

Comandos previstos, siempre dentro de Compose:

- `docker compose exec backend npm test`
- `docker compose exec backend npm run test:db`
- `docker compose exec backend npm run prisma:validate`
- `docker compose exec backend npm run lint`
- Aplicar migraciones con `docker compose exec backend npm run prisma:migrate:dev -- --name checkout_orders` y comprobar con `docker compose exec backend npm run prisma:migrate:status`.

## Referencia del repositorio anterior durante la fase 06

Durante la fase 06 se inspeccionaron las instrucciones, README, roadmap, contratos, historial Git, archivos de backend y pruebas del repositorio de referencia. La copia disponible de ese repositorio sólo contenía código de salud y catálogo; no se encontraron módulos ni pruebas de Stripe, pagos u órdenes. Esta observación es histórica y no describe el estado actual de esta aplicación.

- **Reutilizar como principios:** autoridad del backend sobre disponibilidad/precio, webhook firmado, lectura de pedidos aislada por titular, respuestas de error sin detalles internos y pruebas de API con `node:test`.
- **Adaptar:** forma de componer Express, capas handler/servicio/repositorio y pruebas PostgreSQL al ESM, Prisma y sesión con cookie del proyecto actual.
- **Rehacer:** persistencia de pedidos y snapshots con relaciones/migraciones PostgreSQL/Prisma; no se porta el checkout porque no existe en los archivos inspeccionados. En la fase 06 se excluyeron Redis/BullMQ, reservas/locks de inventario y logística; correo y PDF se implementaron después en la fase 07.

## Referencias de implementación

- Stripe recomienda construir line items en servidor y esperar la confirmación de pago antes de cumplir una compra: [Checkout alojado](https://docs.stripe.com/checkout/quickstart?lang=node), [crear una Checkout Session](https://docs.stripe.com/api/checkout/sessions/create) y [fulfillment mediante Checkout](https://docs.stripe.com/checkout/fulfillment).
- Stripe exige verificar la firma con el cuerpo crudo y recomienda reconocer eventos repetidos; `checkout.session.async_payment_succeeded` también puede confirmar métodos de pago demorados: [webhooks](https://docs.stripe.com/webhooks) y [manejo de endpoints](https://docs.stripe.com/events/manage-webhook-endpoints?lang=node).
- Stripe requiere consentimiento para guardar métodos de pago destinados a reutilización: [clientes existentes](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted).

## Criterios de cierre de backend

- [ ] Sesión y carrito de cuenta son la única fuente de identidad y artículos; precio y estado activo se revalidan antes de Stripe.
- [ ] Las compras pagadas se confirman sólo por webhook firmado, con validación de importe/moneda e idempotencia.
- [ ] Cada Checkout pagado tiene una orden independiente con líneas e importes históricos; “Mis pedidos” sólo devuelve órdenes propias.
- [ ] No se almacena PAN, CVC ni inventario; los cambios de carrito posteriores a Checkout se preservan.
- [ ] Pruebas unitarias, de API y PostgreSQL pasan en Docker Compose.
- [ ] Se integran los estados del backend en el frontend actual y se valida el recorrido completo con el sistema visual del proyecto; la fase sigue abierta hasta cerrar ese trabajo.
