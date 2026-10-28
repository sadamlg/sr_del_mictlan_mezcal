# Contrato de cuentas y perfil

## Propósito y alcance

Este módulo implementa registro, inicio y cierre de sesión, restauración de sesión, recuperación de contraseña, confirmación de registro, cambio confirmado de correo y edición de información personal. Incluye la vista protegida “Mis pedidos” con estado vacío hasta que la fase de pedidos la conecte a datos reales.

No implementa carrito, pagos, administración de usuarios ni verificación de identidad. La landing y el catálogo siguen disponibles sin cuenta.

## Datos de cuenta

- `firstName` y `lastName`: nombre(s) y apellidos obligatorios, normalizados por separado y con límite de 120 caracteres cada uno. El saludo de cuenta y los correos usan `firstName`.
- `email`: obligatorio y único tras quitar espacios y convertirlo a minúsculas. Mientras `emailVerifiedAt` sea nulo, el registro está pendiente: no se emite una sesión y la cuenta no puede iniciar sesión ni consultar datos privados.
- `dateOfBirth`: fecha de calendario válida; al registrarse y al editarla debe acreditar al menos 18 años.
- `address`: calle, número, colonia, ciudad o delegación, estado y código postal. Todos los campos son obligatorios; el código postal debe tener cinco dígitos. No se consulta un servicio externo de direcciones.
- `password`: mínimo 12 caracteres. Sólo se conserva un hash con sal; nunca se devuelve en API ni se escribe en logs.

Los cuatro campos personales anteriores se pueden editar. Cambiar el correo exige la contraseña vigente y una confirmación enviada al nuevo correo. Mientras el enlace no se use, el correo vigente permanece asociado a la cuenta. La fecha de nacimiento nueva se vuelve a validar con el límite de 18 años.

## Sesiones y seguridad

- El backend crea sesiones aleatorias persistidas en PostgreSQL. En la base se guarda el hash del identificador; el valor original sólo viaja en una cookie `HttpOnly`, `SameSite=Lax`, `Path=/` y con vencimiento acotado. En entornos HTTPS la cookie también es `Secure`.
- El registro no crea una sesión. El inicio de sesión y la restauración de sesiones rechazan registros pendientes hasta que se confirme el correo; la confirmación revoca cualquier sesión heredada y crea una sesión nueva para la cuenta activada.
- Cerrar sesión revoca la sesión actual. Restablecer la contraseña revoca las sesiones existentes.
- Las solicitudes del navegador se aceptan desde el origen frontend configurado. No se habilita CORS con comodín y credenciales. Las rutas de escritura de cuenta limitan cada combinación de IP y ruta a 30 solicitudes en 15 minutos; cada proceso mantiene hasta 5000 contadores.
- La API valida y normaliza entradas en el límite. Las respuestas usan `{ "error": { "code", "message", "fields?" } }`; `fields` es opcional y describe errores de campos. Errores de validación son `422`, sesión ausente `401`, correo ocupado `409` y exceso de solicitudes `429`.
- Recuperación de contraseña responde igual exista o no el correo. Tokens de recuperación y confirmación son aleatorios, de un solo uso, tienen vencimiento y se guardan como hash.
- El remitente, contraseñas, tokens, direcciones y fechas de nacimiento no aparecen en logs.

## API

Todas las rutas de negocio usan `/api` y JSON.

| Método y ruta | Sesión | Resultado |
|---|---|---|
| `POST /api/auth/register` | No | Crea un registro pendiente y el trabajo de correo de confirmación en una transacción; responde con instrucciones y no crea cookie de sesión. |
| `POST /api/auth/login` | No | Valida correo y contraseña y crea cookie de sesión sólo si el correo está confirmado. Credenciales inválidas comparten respuesta; una contraseña válida para un registro pendiente recibe `403 EMAIL_NOT_VERIFIED`. |
| `POST /api/auth/logout` | Sí | Revoca la sesión actual y expira la cookie. |
| `GET /api/auth/session` | Opcional | Devuelve el perfil público autenticado o `401`; también revoca una sesión heredada asociada a un registro pendiente. No devuelve datos de autenticación. |
| `POST /api/auth/password-reset-requests` | No | Encola recuperación de forma genérica, sin indicar si existe la cuenta. |
| `POST /api/auth/password-resets` | No | Consume un token vigente y cambia la contraseña. |
| `POST /api/auth/email-confirmations` | No | Consume un token de confirmación de registro o cambio de correo. La confirmación del registro activa la cuenta, emite la cookie de sesión y permite volver a la landing; confirmar un cambio de correo conserva la sesión actual. |
| `GET /api/profile` | Sí | Devuelve `firstName`, `lastName`, correo, estado de confirmación, fecha de nacimiento y dirección del usuario de la sesión. |
| `PATCH /api/profile` | Sí | Actualiza `firstName`, `lastName` y los demás campos permitidos; cambiar correo requiere contraseña vigente y encola confirmación. |
| `GET /api/orders` | Sí | Devuelve la lista real cuando exista el módulo de órdenes; en esta fase es una lista vacía. |

Los cuerpos de registro y perfil no aceptan campos adicionales. El perfil y cualquier recurso posterior se resuelven desde el usuario autenticado; el cliente no puede elegir otro `userId`.

El límite de solicitudes es local a cada proceso y cubre el entorno actual de un backend. Si producción ejecuta varias réplicas, el límite compartido debe guardarse en PostgreSQL para conservar el mismo umbral entre instancias.

## Correo y procesamiento asíncrono

El backend guarda trabajos de confirmación de registro, cambio de correo y recuperación en PostgreSQL. El worker existente los procesa y envía por SMTP. En desarrollo Compose usa Mailpit (`mailpit:1025`), sin credenciales externas. Los trabajos contienen el identificador de usuario y el tipo de mensaje, nunca la contraseña ni el token en claro. El worker crea el token al procesar y sólo persiste su hash. La confirmación de registro y el cambio de correo vencen en 24 horas; la recuperación de contraseña vence en 30 minutos.

Los cuerpos HTML y texto usan los roles de `design.md`: fondo oscuro, superficie carbón, texto marfil y hueso, teal para la marca y teal profundo para la acción principal. La marca y las cabeceras cargan Cinzel Decorative y conservan Georgia como respaldo para clientes que no cargan fuentes web. Los mensajes explican el propósito del enlace, su vigencia y qué hacer si la persona no solicitó la acción. El oro no se usa como CTA de cuenta.

Se reintentan los fallos transitorios con espera acotada y se deja un estado final observable si se agotan los intentos. La integración de Resend y la confirmación de compra con exactamente dos PDF pertenecen a la fase 07.

## Interfaz

La interfaz utiliza la paleta, tipografías, encabezado y controles del sistema actual. Tras registrarse indica que debe confirmarse el correo y que la cuenta aún no está activa; esa vista sólo ofrece volver a la landing. Al abrir el enlace, la confirmación activa la cuenta, inicia sesión y redirige a la landing, donde aparece el saludo con el nombre. Un login pendiente muestra esa causa sin conceder sesión. Los flujos cubren estados de carga, error, éxito, validación y sesión vencida, con formularios etiquetados y navegación usable con teclado y en móvil. “Mis pedidos” presenta un estado vacío claro y un enlace al catálogo; no simula órdenes.

Al iniciar sesión, el acceso de cuenta muestra “Hola” y el nombre de pila. Su menú permite abrir “Mis pedidos” o “Cuenta” y cerrar la sesión; en el móvil las mismas opciones aparecen dentro del menú principal.

## Referencia revisada

Se revisó `../sr_del_mictlan`: el checkout contiene el acceso visual de cuenta en escritorio y móvil, pero no implementa registro, autenticación, perfil u órdenes. Su hoja de ruta propone adaptar casos de autenticación y separar rutas/controladores/servicios. Su código usa CommonJS, Mongoose/MongoDB y Redis/BullMQ; no se porta porque este proyecto usa ESM, Express, Prisma/PostgreSQL y prohíbe Redis/BullMQ. Se adapta el acceso visual con los componentes actuales y se rehace la persistencia y la lógica con el contrato presente. Para nombre(s) y apellidos, no había un contrato ni datos separados que portar: se agrega una migración que conserva nombres existentes y separa la primera palabra del resto para que cada persona pueda corregirlos en su perfil.

Para exigir confirmación antes de activar cuentas se volvió a revisar ese repositorio: no aporta código ni un contrato de autenticación que se pueda reutilizar. Se conserva y adapta el flujo de tokens de un solo uso y el worker de correo ya implementados aquí; se rehacen las reglas de sesión y los mensajes para que el registro permanezca pendiente hasta confirmar.
