# Contrato de carritos

## Propósito y límites

El carrito permite preparar una compra como invitado o con cuenta. El módulo no crea sesiones de Stripe ni órdenes; el checkout implementado se describe en [Contrato de Checkout y pedidos](checkout-y-pedidos.md). No hay reserva ni verificación de existencias.

El carrito de invitado se conserva en `localStorage` del mismo navegador durante 30 días desde su última actividad. El carrito de cuenta se guarda en PostgreSQL. Al iniciar sesión, el backend suma por producto las cantidades del navegador y de la cuenta en una transacción; el resultado se muestra como un solo carrito. Cada cantidad final tiene un máximo de 99. El navegador borra únicamente las cantidades transferidas después de recibir confirmación. Si la petición falla, conserva los artículos y ofrece reintentar. Cerrar sesión oculta el carrito de cuenta y deja disponible un carrito local nuevo.

## Artículos y precios

- Un artículo se identifica por el `slug` estable del producto y una cantidad entera de 1 a 99.
- Cambiar cantidad significa establecer la cantidad absoluta solicitada; no se aceptan precio, total, `accountId` ni estado del producto enviados por el navegador.
- El carrito de cuenta obtiene nombre, disponibilidad y precio actual de `products`. PostgreSQL conserva sólo la relación producto-cuenta y cantidad, nunca una copia del precio.
- Los artículos inactivos que ya estaban guardados permanecen visibles para que la persona pueda quitarlos. Se muestran como no disponibles, sin precio ni subtotal de línea; se excluyen del subtotal.
- El subtotal del carrito de cuenta se calcula en backend usando los precios actuales en centavos de MXN. En un carrito de invitado, la interfaz calcula el subtotal a partir del catálogo público actual; si se abre desde una página que no lo cargó, lo solicita al backend.
- Al iniciar Checkout, el backend vuelve a comprobar que cada producto siga activo y toma su precio vigente. Los importes del carrito no fijan el precio de compra.

## API del carrito de cuenta

Todas las operaciones de este contrato requieren una cookie de sesión válida; la cuenta se deriva exclusivamente de ella. Las respuestas usan `Cache-Control: no-store`. Si la solicitud incluye `Origin`, el backend sólo acepta el frontend configurado. Los errores usan `{ "error": { "code", "message", "fields?" } }`.

| Método y ruta | Resultado |
|---|---|
| `GET /api/cart/account` | Devuelve el carrito de la cuenta, incluidos artículos inactivos y el subtotal actual. Un carrito vacío responde `200` con `items: []` y subtotal cero. |
| `PUT /api/cart/account/items` | Recibe `{ "slug": "mezcal-reposado", "quantity": 2 }`; agrega o establece la cantidad para un producto activo y devuelve el carrito actualizado. |
| `DELETE /api/cart/account/items/:slug` | Quita el artículo de esa cuenta y devuelve `204`; repetir la operación también responde `204`. |
| `POST /api/cart/account/merge` | Recibe `{ "transferId": "uuid", "items": [{ "slug": "mezcal-reposado", "quantity": 2 }] }`, con hasta 100 productos distintos. Suma las cantidades en una transacción y devuelve el carrito. Repetir el mismo `transferId` para esa cuenta no vuelve a sumarlas. |

Un cuerpo inválido o una cantidad fuera de 1–99 responde `422`. Un producto inexistente o inactivo no se puede agregar y responde `409 PRODUCT_NOT_AVAILABLE`. La falta o vencimiento de sesión responde `401`. Un fallo de almacenamiento responde `503 CART_UNAVAILABLE` sin filtrar detalles internos.

Una representación del carrito tiene esta forma:

```json
{
  "cart": {
    "items": [
      {
        "slug": "mezcal-reposado",
        "name": "Mezcal Reposado",
        "quantity": 2,
        "available": true,
        "unitPrice": { "amount": 12345, "currency": "MXN" },
        "lineTotal": { "amount": 24690, "currency": "MXN" }
      }
    ],
    "subtotal": { "amount": 24690, "currency": "MXN" }
  }
}
```

Para un producto inactivo, `available` es `false`, `unitPrice` y `lineTotal` son `null`, y su cantidad aún se puede quitar. Las cifras del ejemplo sólo documentan el formato.

## Interfaz

El encabezado abre un panel lateral accesible desde teclado. El carrito muestra imágenes de producto, cantidades, eliminación y subtotal; también tiene estados de carga, error, vacío y producto no disponible. Si está vacío, **Seguir comprando** lleva a la sección de mezcales. Al continuar al pago, la persona invitada inicia sesión o crea una cuenta; después llega al resumen de compra. El resumen permite editar cantidades y destinatario y abre Stripe Checkout al confirmar.

El webhook firmado de Stripe elimina sólo las líneas que coinciden con la instantánea pagada. Los cambios hechos en el carrito mientras el Checkout está abierto se conservan.

## Persistencia

`account_cart_items` guarda una fila por cuenta y producto; las eliminaciones relacionadas limpian sus filas. `account_cart_merges` registra cada `transferId` para hacer idempotente la fusión. PostgreSQL limita cantidades a 1–99. El navegador conserva sólo `slug`, cantidad, última actividad y un identificador técnico para reintentos; nunca guarda precios.
