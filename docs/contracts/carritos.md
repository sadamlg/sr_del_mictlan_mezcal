# Contrato de carritos

## Propósito y límites

El módulo permite preparar una compra con un único carrito visible. No crea sesiones de Stripe, órdenes, reservas ni verificaciones de existencias; esos comportamientos pertenecen a la fase de Checkout.

El carrito de invitado se conserva en `localStorage` del mismo navegador durante 30 días desde su última actividad. El carrito de cuenta se guarda en PostgreSQL. Al iniciar sesión, el backend suma por producto las cantidades del navegador y de la cuenta en una transacción; el resultado se muestra como un solo carrito. Cada cantidad final tiene un máximo de 99. El navegador borra únicamente las cantidades transferidas después de recibir confirmación. Si la petición falla, conserva los artículos y ofrece reintentar. Cerrar sesión oculta el carrito de cuenta y deja disponible un carrito local nuevo.

## Artículos y precios

- Un artículo se identifica por el `slug` estable del producto y una cantidad entera de 1 a 99.
- Cambiar cantidad significa establecer la cantidad absoluta solicitada; no se aceptan precio, total, `accountId` ni estado del producto enviados por el navegador.
- El carrito de cuenta obtiene nombre, disponibilidad y precio actual de `products`. PostgreSQL conserva sólo la relación producto-cuenta y cantidad, nunca una copia del precio.
- Los artículos inactivos que ya estaban guardados permanecen visibles para que la persona pueda quitarlos. Se muestran como no disponibles, sin precio ni subtotal de línea; se excluyen del subtotal.
- El subtotal del carrito de cuenta se calcula en backend usando los precios actuales en centavos de MXN. En un carrito de invitado, la interfaz calcula el subtotal a partir del catálogo público actual; si se abre desde una página que no lo cargó, lo solicita al backend.
- Antes de Checkout, la fase 06 debe comprobar de nuevo que cada producto siga activo y tomar su precio vigente. Los importes mostrados en esta fase no son una cotización ni fijan un precio de compra.

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

El encabezado abre una sección lateral accesible desde teclado. Las acciones de producto agregan una unidad; el carrito muestra artículos, cantidades, eliminación y subtotal. Si está vacío, indica que no hay artículos y ofrece volver a la tienda. También expone estados de carga, error y producto no disponible. El contador corresponde al carrito visible. Sin prototipo disponible, se aprobó seguir los tokens, la tipografía y los patrones accesibles actuales de `design.md`.

La fase 05 no inicia Checkout ni vacía el carrito tras una compra. La acción de pagar el carrito se conecta con Stripe y la autenticación requerida en la fase 06.

## Persistencia y pruebas

La tabla `account_cart_items` tiene una relación única por cuenta y producto; las eliminaciones de cuenta o producto limpian sus filas relacionadas. `account_cart_merges` registra los identificadores de transferencia por cuenta para evitar sumas repetidas. PostgreSQL restringe las cantidades al rango 1–99. El navegador guarda sólo `slug`, `quantity` y la fecha de última actividad del carrito, además de un identificador técnico para reintentos; nunca guarda precios.

Las pruebas cubren validación de cantidades y slugs, aislamiento de cuentas, suma e idempotencia de transferencias, totales con precio actual, artículos inactivos, operaciones privadas, persistencia Prisma y vencimiento móvil de 30 días del carrito de invitado. Los recorridos de navegador comprueban agregar, actualizar, quitar, recargar, unir el carrito al iniciar sesión, recuperar el catálogo desde páginas de cuenta y mostrar el panel en 320, 768 y 1440 px.

## Referencia revisada

Se revisó el repositorio hermano requerido para esta fase. No contiene módulo, contrato, flujo ni pruebas de carrito reutilizables, por lo que no se porta código; se implementan las reglas desde este contrato sobre Prisma/PostgreSQL y la sesión existente. La retención del carrito de invitado por 30 días sigue el alcance aprobado del MVP.
