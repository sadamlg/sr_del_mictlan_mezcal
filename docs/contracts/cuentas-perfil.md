# Contrato de cuentas y perfil

## Propósito y alcance

Este módulo implementa registro, inicio y cierre de sesión, restauración de sesión, recuperación de contraseña, confirmación de registro, cambio confirmado de correo y edición de información personal. Incluye la vista protegida “Mis pedidos” con estado vacío hasta que la fase de pedidos la conecte a datos reales.

No implementa carrito, pagos, administración de usuarios ni verificación de identidad. La landing y el catálogo siguen disponibles sin cuenta.

## Datos de cuenta

- `name`: nombre obligatorio, normalizado y con límite de longitud.
- `email`: obligatorio y único tras quitar espacios y convertirlo a minúsculas.
- `dateOfBirth`: fecha de calendario válida; al registrarse y al editarla debe acreditar al menos 18 años.
- `address`: calle, número, colonia, ciudad o delegación, estado y código postal. Todos los campos son obligatorios; el código postal debe tener cinco dígitos. No se consulta un servicio externo de direcciones.
- `password`: mínimo 12 caracteres. Sólo se conserva un hash con sal; nunca se devuelve en API ni se escribe en logs.

Los cuatro campos personales anteriores se pueden editar. Cambiar el correo exige la contraseña vigente y una confirmación enviada al nuevo correo. Mientras el enlace no se use, el correo vigente permanece asociado a la cuenta. La fecha de nacimiento nueva se vuelve a validar con el límite de 18 años.

## Sesiones y seguridad

- El backend crea sesiones aleatorias persistidas en PostgreSQL. En la base se guarda el hash del identificador; el valor original sólo viaja en una cookie `HttpOnly`, `SameSite=Lax`, `Path=/` y con vencimiento acotado. En entornos HTTPS la cookie también es `Secure`.
- Cerrar sesión revoca la sesión actual. Restablecer la contraseña revoca las sesiones existentes.
- Las solicitudes del navegador se aceptan desde el origen frontend configurado. No se habilita CORS con comodín y credenciales.
- La API valida y normaliza entradas en el límite. Las respuestas usan `{ "error": { "code", "message" } }`; errores de validación son `422`, sesión ausente `401` y correo ocupado `409`.
- Recuperación de contraseña responde igual exista o no el correo. Tokens de recuperación y confirmación son aleatorios, de un solo uso, tienen vencimiento y se guardan como hash.
- El remitente, contraseñas, tokens, direcciones y fechas de nacimiento no aparecen en logs.

## API

Todas las rutas de negocio usan `/api` y JSON.

| Método y ruta | Sesión | Resultado |
|---|---|---|
| `POST /api/auth/register` | No | Crea la cuenta, sesión y trabajo de correo de confirmación; responde con el perfil público y crea la cookie de sesión. |
| `POST /api/auth/login` | No | Valida correo y contraseña y crea cookie de sesión. Credenciales inválidas comparten respuesta. |
| `POST /api/auth/logout` | Sí | Revoca la sesión actual y expira la cookie. |
| `GET /api/auth/session` | Opcional | Devuelve el perfil público autenticado o `401`. No devuelve datos de autenticación. |
| `POST /api/auth/password-reset-requests` | No | Encola recuperación de forma genérica, sin indicar si existe la cuenta. |
| `POST /api/auth/password-resets` | No | Consume un token vigente y cambia la contraseña. |
| `POST /api/auth/email-confirmations` | No | Consume un token de confirmación de registro o cambio de correo. |
| `GET /api/profile` | Sí | Devuelve nombre, correo, estado de confirmación, fecha de nacimiento y dirección del usuario de la sesión. |
| `PATCH /api/profile` | Sí | Actualiza campos permitidos; cambiar correo requiere contraseña vigente y encola confirmación. |
| `GET /api/orders` | Sí | Devuelve la lista real cuando exista el módulo de órdenes; en esta fase es una lista vacía. |

Los cuerpos de registro y perfil no aceptan campos adicionales. El perfil y cualquier recurso posterior se resuelven desde el usuario autenticado; el cliente no puede elegir otro `userId`.

## Correo y procesamiento asíncrono

El backend guarda trabajos de confirmación de registro, cambio de correo y recuperación en PostgreSQL. El worker existente los procesa y envía por SMTP. En desarrollo Compose usa Mailpit (`mailpit:1025`), sin credenciales externas. Los trabajos contienen el identificador de usuario y el tipo de mensaje, nunca la contraseña ni el token en claro. El worker crea el token al procesar y sólo persiste su hash.

Se reintentan los fallos transitorios con espera acotada y se deja un estado final observable si se agotan los intentos. La integración de Resend y la confirmación de compra con exactamente dos PDF pertenecen a la fase 07.

## Interfaz

La interfaz utiliza la paleta, tipografías, encabezado y controles del sistema actual. Los flujos cubren estados de carga, error, éxito, validación y sesión vencida, con formularios etiquetados y navegación usable con teclado y en móvil. “Mis pedidos” presenta un estado vacío claro y un enlace al catálogo; no simula órdenes.

## Referencia revisada

Se revisó `../sr_del_mictlan`: el checkout contiene el acceso visual de cuenta en escritorio y móvil, pero no implementa registro, autenticación, perfil u órdenes. Su hoja de ruta propone adaptar casos de autenticación y separar rutas/controladores/servicios. Su código usa CommonJS, Mongoose/MongoDB y Redis/BullMQ; no se porta porque este proyecto usa ESM, Express, Prisma/PostgreSQL y prohíbe Redis/BullMQ. Se adapta el acceso visual con los componentes actuales y se rehace la persistencia y la lógica con el contrato presente.
