# Contrato de cuentas y perfil · fase 04

## Alcance

El módulo cubre registro y confirmación de correo, inicio y cierre de sesión, restauración de sesión, recuperación y cambio de contraseña, actualización del perfil y cambio de correo confirmado. La cuenta tiene tres secciones: **Información personal**, **Contraseña** y **Mis pedidos**. La contraseña no aparece en la navegación global.

El catálogo y el carrito de invitado están disponibles sin cuenta. El pago y los datos de cuenta requieren sesión. Los detalles de carrito y pedidos están en [sus contratos](05-CARTS.md) y [Checkout y pedidos](06-CHECKOUT-ORDERS.md).

## Datos y validaciones

- Nombre(s), apellidos, correo, fecha de nacimiento y dirección son datos del perfil. El correo debe ser único; la fecha debe acreditar al menos 18 años; el código postal tiene cinco dígitos.
- El registro queda pendiente hasta consumir el enlace de confirmación. El enlace de registro vence en 24 horas; confirmar activa la cuenta y crea una sesión.
- El cambio de correo requiere contraseña vigente y confirmación del nuevo destino. El correo anterior sigue activo hasta confirmar el cambio.
- Las contraseñas tienen de 12 a 128 caracteres y se almacenan como hash con sal. Nunca se devuelven por API ni se escriben en logs.
- Cambiar contraseña desde la sección **Contraseña** revoca las otras sesiones. La recuperación responde de forma genérica, use o no una cuenta existente; su token de un solo uso vence en 30 minutos.

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

## Páginas de cuenta

| Ruta | Acceso | Uso |
|---|---|---|
| `/cuenta/registro` | Público | Crear una cuenta pendiente de confirmación. |
| `/cuenta/iniciar-sesion` | Público | Entrar; `?continuar=checkout` conserva la intención de compra. |
| `/cuenta/recuperar-contrasena` | Público | Solicitar un enlace de recuperación. |
| `/cuenta/restablecer-contrasena?token=…` | Con enlace | Cambiar la contraseña. |
| `/cuenta/confirmar-correo?token=…` | Con enlace | Confirmar una cuenta o un cambio de correo. |
| `/cuenta`, `/cuenta/seguridad`, `/cuenta/pedidos` | Sesión opcional | Sin sesión ofrecen acceso; con sesión muestran datos privados. |

El backend sólo entrega datos privados después de validar la cookie de sesión.

## Correo e interfaz

El worker obtiene de PostgreSQL los trabajos de confirmación de registro, cambio de correo y recuperación. En Compose, Mailpit (`mailpit:1025`) captura esos mensajes por SMTP; en Railway se envían mediante la API HTTPS de Resend. La [guía de Resend](../resend.md) detalla su configuración. El correo de compra se describe en el [contrato de la fase 07](07-PURCHASE-EMAIL-PDF.md).

Después de registrarse, la interfaz explica que debe confirmar el correo. Si el registro comenzó al intentar comprar, confirmar inicia sesión, transfiere el carrito de invitado y lleva al resumen de compra; en los demás casos, vuelve a la tienda. Confirmar un cambio de correo conserva la sesión. Los formularios de registro y cambio de contraseña permiten mostrar u ocultar la contraseña. El aviso de cambios guardados en el perfil es temporal; al volver a esa sección sólo permanece la confirmación del correo. **Mis pedidos** muestra pedidos reales y sólo del titular; la interfaz también resuelve estados sin sesión, carga, error y sesión vencida.
