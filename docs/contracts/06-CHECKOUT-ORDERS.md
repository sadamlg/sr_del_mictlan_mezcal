# Contrato de Checkout y pedidos · fase 06

## Recorrido de compra

1. El checkout requiere sesión. Una persona invitada pasa por inicio de sesión o registro; confirmar una cuenta nueva conserva la intención y vuelve al resumen de compra.
2. El resumen ordena sus secciones así: productos seleccionados editables con imágenes; datos de envío y contacto; tarjetas guardadas que Stripe permite volver a mostrar; total y acciones. Se pueden cambiar cantidades y editar destinatario para esa orden. Estos cambios no modifican el perfil.
3. Al confirmar, la API crea una orden pendiente desde el carrito y precios actuales del servidor, y abre Stripe Checkout alojado.
4. Stripe devuelve al usuario a la tienda con el ID de la sesión. La página consulta su estado hasta que el webhook firmado confirma el pago; entonces recarga el carrito y “Mis pedidos”. “Volver a pedir” repone los artículos y abre directamente el resumen.

No hay reserva ni comprobación de existencias. La aplicación no almacena PAN, CVC ni IDs de métodos de pago. Stripe puede guardar una tarjeta cuando el comprador da su consentimiento; el resumen sólo muestra marca, últimos cuatro y vencimiento, además del titular si Stripe lo devuelve.

La página `/cuenta/checkout` requiere sesión. La [guía de Stripe](../stripe.md) explica la configuración del webhook en local y staging.

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

El envío del correo y el PDF se describen en el [contrato de la fase 07](07-PURCHASE-EMAIL-PDF.md).
