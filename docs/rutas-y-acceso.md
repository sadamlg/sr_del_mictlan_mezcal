# Rutas del sistema y quién puede usarlas

Esta guía explica, sin asumir conocimientos técnicos, qué direcciones tiene la tienda y cuándo hace falta iniciar sesión o usar un enlace recibido por correo.

## Primero: ¿qué es una ruta?

Una **ruta** es una dirección que lleva a una página o pide una acción al sistema. Por ejemplo:

- `/cuenta/registro` abre el formulario para crear una cuenta.
- `POST /api/auth/register` envía ese formulario al backend para procesar el registro.

La ruta de la página y la ruta de la API son distintas aunque formen parte del mismo recorrido. La página muestra la interfaz; la API recibe o devuelve datos.

En las rutas de API, la palabra al principio indica qué se quiere hacer:

- `GET`: consultar información.
- `POST`: enviar información o solicitar una acción.
- `PATCH`: actualizar información existente.

## Tres formas de acceso

| Tipo | Qué significa |
|---|---|
| **Pública** | Se puede usar sin iniciar sesión. Puede seguir teniendo validaciones o límites de uso. |
| **Protegida por enlace** | No requiere una sesión, pero sí un token válido de un solo uso enviado por correo. |
| **Privada** | Requiere una sesión iniciada. El backend comprueba la cookie de sesión antes de devolver o modificar datos personales. |

Una dirección pública no significa que cualquier persona pueda consultar los datos de una cuenta. Significa únicamente que no hace falta haber iniciado sesión para abrir esa página o llamar a esa operación.

## Páginas de la tienda

| Dirección | Acceso | Qué ocurre |
|---|---|---|
| `/` | Pública | Muestra la landing y el catálogo. |
| `/cuenta/iniciar-sesion` | Pública | Permite iniciar sesión. |
| `/cuenta/registro` | Pública | Permite registrar una cuenta. Después muestra instrucciones para confirmar el correo. |
| `/cuenta/recuperar-contrasena` | Pública | Permite pedir un enlace para restablecer la contraseña. |
| `/cuenta/restablecer-contrasena?token=…` | Protegida por enlace | El formulario necesita un token vigente enviado por correo. |
| `/cuenta/confirmar-correo?token=…` | Protegida por enlace | Confirma la dirección. Para una cuenta nueva, inicia la sesión y vuelve a la landing. |
| `/cuenta` | Página de cuenta | Sin sesión, muestra opciones para iniciar sesión o registrarse. Con sesión, muestra el perfil. |
| `/cuenta/pedidos` | Página de cuenta | Sin sesión, muestra opciones para iniciar sesión o registrarse. Con sesión, consulta los pedidos. |

**Aclaración sobre las páginas de cuenta:** `/cuenta` y `/cuenta/pedidos` se pueden abrir aunque no se haya iniciado sesión. La dirección no revela los datos: la página los solicita al backend, y el backend los entrega sólo si la sesión es válida. Si falta la sesión, la página presenta el acceso correspondiente.

## Operaciones de API públicas

Estas operaciones no requieren una sesión iniciada:

| Método y dirección | Para qué sirve |
|---|---|
| `GET /health` | Comprueba que el backend puede consultar la base de datos. Es una ruta de estado técnico. |
| `GET /api/catalog/products` | Devuelve los productos activos del catálogo. |
| `POST /api/auth/register` | Recibe los datos del registro y encola el correo de confirmación. La cuenta queda pendiente hasta confirmar. |
| `POST /api/auth/login` | Comprueba las credenciales y crea una sesión si la cuenta ya confirmó su correo. |
| `POST /api/auth/logout` | Cierra la sesión si hay una cookie válida; también se puede llamar sin sesión. |
| `GET /api/auth/session` | Comprueba si el navegador ya tiene una sesión. Devuelve la cuenta si es válida o `401` si no existe o venció. |
| `POST /api/auth/password-reset-requests` | Solicita un correo para recuperar la contraseña. La respuesta no revela si el correo está registrado. |
| `GET /api/visits` | Devuelve el contador público de visitas. |
| `POST /api/visits` | Registra una visita después de validar su identificador. |

Las solicitudes de recuperación y confirmación de correo no usan sesión, pero sí requieren el token de un solo uso que llega en el mensaje:

| Método y dirección | Para qué sirve |
|---|---|
| `POST /api/auth/password-resets` | Cambia la contraseña con un token válido. |
| `POST /api/auth/email-confirmations` | Consume el token. Si confirma una cuenta nueva, el backend la activa y crea la sesión; si confirma un cambio de correo, conserva la sesión que ya existía. |

## Operaciones privadas de API

Estas operaciones requieren la cookie de una sesión válida:

| Método y dirección | Para qué sirve |
|---|---|
| `GET /api/profile` | Consulta el perfil de la persona conectada. |
| `PATCH /api/profile` | Actualiza el perfil de la persona conectada. Cambiar el correo también requiere su contraseña actual y confirmar el nuevo correo. |
| `GET /api/orders` | Consulta los pedidos de la persona conectada. En esta fase devuelve una lista vacía hasta que exista el módulo de pedidos. |

## Cómo se conectan las rutas al confirmar una cuenta

1. La persona envía el formulario de `/cuenta/registro`.
2. La página envía los datos a `POST /api/auth/register`; el backend guarda la cuenta pendiente y prepara el correo.
3. Al abrir el enlace del correo, el navegador llega a `/cuenta/confirmar-correo?token=…`.
4. Esa página envía el token a `POST /api/auth/email-confirmations`.
5. Si el token es válido, el backend activa la cuenta y entrega una cookie de sesión. La página vuelve a `/`.
6. La landing comprueba la sesión con `GET /api/auth/session` y muestra el saludo con el nombre.

Para ver el perfil o los pedidos, el navegador envía la cookie automáticamente. Si no hay una sesión válida, la API responde `401` y no entrega esos datos.

## Qué todavía no tiene rutas

En el sistema actual no están definidas operaciones para carrito, iniciar checkout ni crear pedidos. Existe `GET /api/orders` para consultar pedidos, pero el módulo que los genera se implementará después. El catálogo se muestra dentro de la landing; no hay una ruta de detalle individual de producto.

## Dónde se mantienen estas rutas

La lista debe mantenerse de acuerdo con el código, no sólo con este documento:

- Las páginas web están en `frontend/src/app/`.
- Las operaciones del backend están declaradas en `backend/src/server.js`.
- La comprobación de sesión y el acceso a perfil y pedidos se conectan en `backend/src/accounts/account-handler.js`.
- El endpoint del frontend `POST /api/visits` está en `frontend/src/app/api/visits/route.js` y reenvía la solicitud al backend.
