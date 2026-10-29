# Rutas y acceso

Esta guía diferencia las páginas que muestra el navegador de las operaciones de la API. Las primeras presentan la interfaz; las segundas leen o cambian datos en el backend.

## Tipos de acceso

| Acceso | Significado |
|---|---|
| Público | No requiere sesión; puede tener validaciones adicionales. |
| Con enlace | Requiere un token vigente, de un solo uso, enviado por correo. |
| Privado | Requiere una sesión válida; el backend obtiene la identidad de la cookie. |
| Firma de Stripe | El webhook no usa sesión de cliente; requiere una firma válida de Stripe. |

En la API, `GET` consulta, `POST` solicita una acción, `PATCH` actualiza campos, `PUT` establece el estado de un elemento y `DELETE` lo elimina.

## Páginas

| Ruta | Acceso | Uso |
|---|---|---|
| `/` | Público | Landing y catálogo. |
| `/cuenta/registro` | Público | Crear una cuenta; después se solicita confirmar el correo. |
| `/cuenta/iniciar-sesion` | Público | Iniciar sesión. `?continuar=checkout` conserva la intención de compra. |
| `/cuenta/recuperar-contrasena` | Público | Solicitar un enlace de recuperación. |
| `/cuenta/restablecer-contrasena?token=…` | Con enlace | Cambiar la contraseña con un token vigente. |
| `/cuenta/confirmar-correo?token=…` | Con enlace | Confirmar una cuenta o un cambio de correo. Un registro iniciado desde Checkout continúa al resumen de compra; en otro caso vuelve a la tienda. |
| `/cuenta` | Sesión opcional | Sin sesión, ofrece acceso; con sesión, muestra información personal. |
| `/cuenta/seguridad` | Sesión opcional | Sin sesión, ofrece acceso; con sesión, muestra el formulario de contraseña. |
| `/cuenta/pedidos` | Sesión opcional | Sin sesión, ofrece acceso; con sesión, muestra pedidos pagados propios. |
| `/cuenta/checkout` | Privado | Resumen de compra y acción para abrir Stripe Checkout. |

Aunque algunas páginas de cuenta se pueden abrir sin sesión, los datos privados sólo los entrega la API después de comprobar la cookie.

## API sin sesión de cliente

| Método y ruta | Uso |
|---|---|
| `GET /health` | Estado de la API y conexión a la base de datos. |
| `GET /api/catalog/products` | Productos activos del catálogo. |
| `POST /api/auth/register`, `POST /api/auth/login` | Registro pendiente e inicio de sesión de cuentas confirmadas. |
| `GET /api/auth/session` | Comprobar la sesión actual; responde `401` si no existe o venció. |
| `POST /api/auth/logout` | Cerrar la sesión actual si existe. |
| `POST /api/auth/password-reset-requests`, `POST /api/auth/password-resets` | Solicitar y consumir la recuperación de contraseña. |
| `POST /api/auth/email-confirmations` | Consumir un token de confirmación de cuenta o correo. |
| `GET /api/visits`, `POST /api/visits` | Consultar y registrar el contador de sesiones de la landing. |
| `POST /api/webhooks/stripe` | Recibir eventos con firma Stripe válida; no se autentica con cookie. |

## API privada

Estas operaciones requieren sesión válida. El backend deriva la cuenta de la cookie, nunca de un `accountId` del navegador.

| Método y ruta | Uso |
|---|---|
| `GET /api/profile`, `PATCH /api/profile` | Consultar y actualizar información personal. El cambio de correo requiere contraseña y confirmación del nuevo correo. |
| `PATCH /api/profile/password` | Cambiar la contraseña desde la cuenta. |
| `GET /api/cart/account` | Consultar carrito persistido. |
| `POST /api/cart/account/merge` | Fusionar el carrito de invitado de forma idempotente. |
| `PUT /api/cart/account/items`, `DELETE /api/cart/account/items/:slug` | Establecer cantidad o retirar un producto. |
| `GET /api/checkout/payment-methods` | Consultar los datos seguros de tarjetas guardadas en Stripe. |
| `POST /api/checkout/sessions` | Crear una sesión de Stripe a partir de los datos vigentes del servidor. |
| `GET /api/orders` | Consultar sólo pedidos pagados del titular de la sesión. |

## Flujo de cuenta nueva durante la compra

1. Desde Checkout, una persona invitada inicia sesión o crea una cuenta. La intención de compra se conserva mientras confirma el correo.
2. Al confirmar el correo, el backend activa la cuenta y crea la sesión.
3. El carrito de invitado se transfiere al carrito de cuenta y la interfaz abre `/cuenta/checkout`.
4. El resumen permite confirmar destinatario y artículos; la tienda crea una sesión de pago y navega a Stripe Checkout.
5. El webhook firmado confirma la orden. El retorno del navegador sólo muestra el estado informativo.

## Dónde verificar el contrato

- Páginas: `frontend/src/app/`.
- API: registro de rutas en `backend/src/server.js` y handlers de cada módulo bajo `backend/src/`.
- El contador también tiene un endpoint Next.js en `frontend/src/app/api/visits/route.js`, que reenvía la solicitud a la API.
