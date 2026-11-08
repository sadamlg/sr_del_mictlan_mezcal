# Contrato de cuentas y perfil

## Alcance

El módulo cubre registro y confirmación de correo, inicio y cierre de sesión, restauración de sesión, recuperación y cambio de contraseña, actualización del perfil y cambio de correo confirmado. La cuenta tiene tres secciones: **Información personal**, **Contraseña** y **Mis pedidos**. La contraseña no aparece en la navegación global.

El catálogo y el carrito de invitado están disponibles sin cuenta. El pago y los datos de cuenta requieren sesión. Los detalles de carrito y pedidos están en [sus contratos](carritos.md) y [Checkout y pedidos](checkout-y-pedidos.md).

## Datos y validaciones

- Nombre(s), apellidos, correo, fecha de nacimiento y dirección son datos del perfil. El correo debe ser único; la fecha debe acreditar al menos 18 años; el código postal tiene cinco dígitos.
- El registro queda pendiente hasta consumir el enlace de confirmación. El enlace de registro vence en 24 horas; confirmar activa la cuenta y crea una sesión.
- El cambio de correo requiere contraseña vigente y confirmación del nuevo destino. El correo anterior sigue activo hasta confirmar el cambio.
- Las contraseñas tienen de 12 a 128 caracteres y se almacenan como hash con sal. Nunca se devuelven por API ni se escriben en logs.
- Cambiar contraseña desde la sección **Contraseña** revoca las otras sesiones. La recuperación responde de forma genérica, use o no una cuenta existente; su token de un solo uso vence en 30 minutos.

## Datos de cuenta

- `firstName` y `lastName`: nombre(s) y apellidos obligatorios, normalizados por separado y con límite de 120 caracteres cada uno. El saludo de cuenta y los correos usan `firstName`.
- `email`: obligatorio y único tras quitar espacios y convertirlo a minúsculas. Mientras `emailVerifiedAt` sea nulo, el registro está pendiente: no se emite una sesión y la cuenta no puede iniciar sesión ni consultar datos privados.
- `dateOfBirth`: fecha de calendario válida; al registrarse y al editarla debe acreditar al menos 18 años.
- `address`: calle, número, colonia, ciudad o delegación, estado y código postal. Todos los campos son obligatorios; el código postal debe tener cinco dígitos. No se consulta un servicio externo de direcciones.
- `password`: mínimo 12 caracteres. Sólo se conserva un hash con sal; nunca se devuelve en API ni se escribe en logs.

Los cuatro campos personales anteriores se pueden editar. Cambiar el correo exige la contraseña vigente y una confirmación enviada al nuevo correo. Mientras el enlace no se use, el correo vigente permanece asociado a la cuenta. La fecha de nacimiento nueva se vuelve a validar con el límite de 18 años.

## Sesión y errores

La sesión se persiste en PostgreSQL; la base guarda el hash del identificador. El original sólo viaja en una cookie `HttpOnly`, `SameSite=Lax` y `Path=/`, con duración de siete días y `Secure` bajo HTTPS. La identidad de cada recurso privado se deriva de esa sesión.

El backend acepta el origen frontend configurado y no habilita CORS comodín con credenciales. Registro y edición de perfil usan validación propia, sin los avisos nativos del navegador; el servidor vuelve a validar cada entrada. Guardar perfil sólo se activa si hay cambios respecto a los datos cargados. Las rutas de escritura de cuenta limitan cada combinación de IP y ruta a 30 solicitudes por 15 minutos por proceso. Entradas inválidas responden `422`, sesión ausente `401`, correo ocupado `409` y exceso de solicitudes `429`; los errores usan `{ "error": { "code", "message", "fields?" } }`.

## API

Todas las rutas de negocio usan `/api` y JSON.

| Método y ruta | Acceso | Resultado |
|---|---|---|
| `POST /api/auth/register` | Público | Crea registro pendiente y encola confirmación; no crea sesión. |
| `POST /api/auth/login` | Público | Crea sesión sólo para cuentas confirmadas. |
| `POST /api/auth/logout` | Sesión opcional | Revoca la sesión actual y expira la cookie. |
| `GET /api/auth/session` | Sesión opcional | Devuelve la cuenta autenticada o `401`. |
| `POST /api/auth/password-reset-requests` | Público | Encola recuperación con respuesta genérica. |
| `POST /api/auth/password-resets` | Token | Consume el token y restablece contraseña. |
| `POST /api/auth/email-confirmations` | Token | Confirma registro o cambio de correo. |
| `GET /api/profile`, `PATCH /api/profile` | Privado | Consulta o actualiza perfil; el cambio de correo exige contraseña. |
| `PATCH /api/profile/password` | Privado | Cambia la contraseña y revoca sesiones previas. |
| `GET /api/orders` | Privado | Devuelve pedidos pagados del titular; sin compras responde `orders: []`. |

Los cuerpos de registro y perfil rechazan campos no permitidos. Nunca aceptan un `userId` para elegir a qué cuenta aplicar el cambio.

El límite de solicitudes es local a cada proceso. Con varias réplicas se necesita un mecanismo compartido para imponer un mismo umbral entre instancias.

## Correo e interfaz

El worker obtiene de PostgreSQL los trabajos de confirmación de registro, cambio de correo y recuperación. En Railway los envía mediante la API HTTPS de Resend; en Compose, Mailpit (`mailpit:1025`) captura esos mensajes por SMTP sin usar un proveedor externo. El correo de compra también usa Resend y se describe en el [contrato de Checkout y pedidos](checkout-y-pedidos.md).

Para reproducir la configuración del dominio, los remitentes y el worker, consulta la [guía de Resend](../services/RESEND.md) y la [guía de Neubox/cPanel](../services/NEUBOX.md).

Los trabajos de cuenta contienen identificador de usuario y tipo de mensaje, no la contraseña ni el token en claro. El worker crea el token al procesar y persiste su hash; los enlaces de confirmación de cuenta y cambio de correo vencen en 24 horas y los de recuperación en 30 minutos.

Después de registrarse, la interfaz explica que debe confirmar el correo. Si el registro comenzó al intentar comprar, confirmar inicia sesión, transfiere el carrito de invitado y lleva al resumen de compra; en los demás casos, vuelve a la tienda. Confirmar un cambio de correo conserva la sesión. Los formularios de registro y cambio de contraseña permiten mostrar u ocultar la contraseña. El aviso de cambios guardados en el perfil es temporal; al volver a esa sección sólo permanece la confirmación del correo. **Mis pedidos** muestra pedidos reales y sólo del titular; la interfaz también resuelve estados sin sesión, carga, error y sesión vencida.

## Referencia revisada durante la fase 04

Este apartado conserva la revisión histórica realizada durante esa fase; no afirma que el repositorio de referencia siga disponible o tenga el mismo contenido.

Se revisó `../sr_del_mictlan`: el checkout contiene el acceso visual de cuenta en escritorio y móvil, pero no implementa registro, autenticación, perfil u órdenes. Su hoja de ruta propone adaptar casos de autenticación y separar rutas/controladores/servicios. Su código usa CommonJS, Mongoose/MongoDB y Redis/BullMQ; no se porta porque este proyecto usa ESM, Express, Prisma/PostgreSQL y prohíbe Redis/BullMQ. Se adapta el acceso visual con los componentes actuales y se rehace la persistencia y la lógica con el contrato presente. Para nombre(s) y apellidos, no había un contrato ni datos separados que portar: se agrega una migración que conserva nombres existentes y separa la primera palabra del resto para que cada persona pueda corregirlos en su perfil.

Para exigir confirmación antes de activar cuentas se volvió a revisar ese repositorio: no aporta código ni un contrato de autenticación que se pueda reutilizar. Se conserva y adapta el flujo de tokens de un solo uso y el worker de correo ya implementados aquí; se rehacen las reglas de sesión y los mensajes para que el registro permanezca pendiente hasta confirmar.
