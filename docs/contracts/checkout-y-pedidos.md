# Contrato de Checkout y pedidos

**Fase:** 06 · Stripe Checkout y pedidos
**Estado:** contrato de implementación
**Dependencias:** fases 03, 04 y 05; PostgreSQL y Prisma; sesión de cuenta vigente.

## Propósito y límites

Conectar el carrito de cuenta con Stripe Checkout alojado y convertir una sesión pagada en un pedido histórico independiente que sólo su titular puede consultar. El backend conserva la autoridad sobre la sesión, los productos, precios, importes, pedidos y confirmaciones.

Esta fase no comprueba ni reserva inventario. No almacena números de tarjeta, CVC, ni identificadores de métodos de pago. La opción de guardar un método queda en el Checkout alojado de Stripe y requiere consentimiento explícito allí; la aplicación puede conservar sólo el identificador de Customer de Stripe para asociar compras futuras. No agrega administración de tarjetas al perfil. Correo de compra, Resend y PDF pertenecen a la fase 07.

## Comportamiento

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

## Contrato de datos y API

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

## Orden de implementación y pruebas

1. Añadir pruebas unitarias de servicio/handler para autenticación, carrito vacío, producto no disponible, precio vigente, sesión alojada construida sólo desde datos del backend, fallo de Stripe, firma inválida, confirmación pagada, total/moneda incorrectos, idempotencia y aislamiento de órdenes.
2. Observar fallar esas pruebas antes de implementar. Mantener `node:test`; no agregar un runner.
3. Implementar repositorio, servicio, handlers y rutas Express; aplicar migración Prisma y cubrir persistencia, transacciones y aislamiento con pruebas de base en Compose.
4. Probar el webhook HTTP con un cuerpo crudo y firma válida generada con la utilidad de prueba de Stripe. No requiere credenciales reales; la creación de sesiones se inyecta en pruebas. El Checkout real y el webhook con Stripe CLI quedan como verificación de integración externa para staging.
5. Implementar frontend con el contrato visual existente en `design.md` y los patrones de cuenta y carrito: al proceder desde el carrito, cerrar el panel al pasar a autenticación, conservar la intención de compra después de iniciar sesión o confirmar una cuenta nueva, y mostrar un resumen con datos del titular y domicilio, tarjetas guardadas con consentimiento (sólo marca, últimos cuatro y vencimiento), imagen, productos, cantidades y total antes de iniciar Stripe. El resumen es informativo: Checkout alojado sigue gestionando la elección/entrada de la tarjeta y la aplicación no permite administrar métodos de pago. Incluir retorno informativo, estados de carga/error/vacío y pedidos reales del titular. La vuelta del navegador no marca pedidos como pagados.

Comandos previstos, siempre dentro de Compose:

- `docker compose exec backend npm test`
- `docker compose exec backend npm run test:db`
- `docker compose exec backend npm run prisma:validate`
- `docker compose exec backend npm run lint`
- Aplicar migraciones con `docker compose exec backend npm run prisma:migrate:dev -- --name checkout_orders` y comprobar con `docker compose exec backend npm run prisma:migrate:status`.

## Referencia del repositorio anterior

Se inspeccionaron sus instrucciones, README, roadmap, contratos, historial Git, archivos de backend y pruebas. El checkout local está en una etapa previa: sólo contiene código de salud y catálogo; no hay módulos, contratos ni pruebas implementados para Stripe, pagos u órdenes, y el historial disponible no contiene esos archivos. Aunque su roadmap afirma haber revisado una implementación legado, esa implementación no está presente en la referencia disponible.

- **Reutilizar como principios:** autoridad del backend sobre disponibilidad/precio, webhook firmado, lectura de pedidos aislada por titular, respuestas de error sin detalles internos y pruebas de API con `node:test`.
- **Adaptar:** forma de componer Express, capas handler/servicio/repositorio y pruebas PostgreSQL al ESM, Prisma y sesión con cookie del proyecto actual.
- **Rehacer:** persistencia de pedidos y snapshots con relaciones/migraciones PostgreSQL/Prisma; no se porta el checkout porque no existe en los archivos inspeccionados. Se excluyen explícitamente Redis/BullMQ, reservas/locks de inventario, logística, correo y PDF.

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
