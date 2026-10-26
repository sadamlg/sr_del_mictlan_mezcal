# Contrato de alcance funcional del MVP

**Estado:** alcance funcional aprobado. Este documento define qué debe ofrecer la primera versión de la tienda y sirve como base del roadmap y de los contratos de cada módulo. El README describe el stack y la arquitectura; aquí se fija el comportamiento del producto.

## Objetivo

Publicar una tienda en línea que presente la marca y sus productos, permita a visitantes y clientes preparar compras, cobre mediante Stripe Checkout y permita a cada cliente consultar sus pedidos.

## Incluido en el MVP

### Landing y catálogo

- La landing incluye encabezado, navegación, sección principal y escaparate de productos con la identidad visual de la marca.
- La landing muestra un contador persistente de sesiones que la visitaron. Una recarga en la misma pestaña no suma otra visita; una sesión nueva sí. El contador no guarda IP ni identifica personas.
- Agregar, sustituir o ajustar imágenes, video y otros medios destinados a la landing o al escaparate es trabajo de contenido y presentación dentro de este alcance; por sí solo no requiere modificar este contrato. Se revisa el alcance si el cambio añade una página, un flujo o una capacidad nueva para el usuario.
- El alcance de contenido se limita a la landing. Una página sencilla de “Nosotros” o información de la empresa podrá definirse durante el diseño del módulo de landing.
- Los productos, precios, descripciones, estado activo y referencias de sus medios se mantienen manualmente en la base de datos. No habrá una interfaz administrativa para editarlos ni para cargar archivos.
- La tienda presenta productos activos. El sistema valida que el producto siga activo y usa su precio vigente al iniciar el pago.
- No hay inventario ni comprobación de existencias. Mantener activo un producto significa que se ofrece para compra; corresponde al responsable del catálogo decidir si puede venderse.

### Aviso de mayoría de edad

- Si la persona no ha confirmado su mayoría de edad en la pestaña actual, el modal aparece cuando llega a la sección de colección; el hero puede verse antes.
- El modal pregunta “¿Eres mayor de edad?” y permite elegir “Entrar al Mictlán” o “No, salir del sitio”.
- Al elegir “Entrar al Mictlán”, la persona puede continuar. La confirmación se conserva en `sessionStorage` de esa pestaña para que el modal no reaparezca al recargarla.
- Al elegir “No, salir del sitio”, se abre Google en una pestaña nueva y la tienda permanece abierta en la pestaña original; esa respuesta no concede acceso a la tienda.
- El aviso es una declaración de edad, no una verificación de identidad. El registro realiza la validación de edad indicada en la sección de cuentas.

### Cuentas y perfil

- Una persona puede registrarse, iniciar y cerrar sesión, y recuperar su contraseña mediante un enlace enviado por correo.
- El registro solicita nombre, correo electrónico, fecha de nacimiento y dirección en México. La fecha debe ser válida y acreditar que la persona tiene al menos 18 años.
- La dirección incluye calle, número, colonia, ciudad o delegación, estado y código postal. Se validan los campos y el formato básico del código postal; no se consulta una base externa de direcciones.
- La cuenta contiene dos vistas: información personal editable y “Mis pedidos”.
- Se requiere iniciar sesión para pagar, no para visitar la tienda ni para usar el carrito.

### Carrito y compra

- Un visitante puede agregar productos, cambiar cantidades y quitarlos sin crear una cuenta.
- El carrito de invitado se conserva en el mismo navegador durante 30 días desde la última actividad y mantiene sus productos al registrarse o iniciar sesión. Si la cuenta ya tiene productos, ambos conjuntos permanecen separados y visibles en una sola sección de carrito, cada uno con sus propios artículos, total y acción de pago.
- El carrito de la cuenta se conserva para futuras visitas. Completar una compra no vacía el otro conjunto.
- Cada conjunto se paga por separado y genera una orden independiente. No se fusionan ni se cobran juntos.
- Antes de iniciar el pago, el sistema vuelve a validar el estado activo y el precio vigente de cada producto. No reserva ni comprueba existencias.

### Pago, pedidos y correo

- El pago se realiza en Stripe Checkout alojado.
- Si el cliente da su consentimiento, Stripe puede guardar el método de pago para reutilizarlo en futuras compras. El perfil no incluye gestión de tarjetas: para usar otra tarjeta, el cliente la introduce en Stripe al pagar una nueva orden. La aplicación no almacena el número completo ni el código de seguridad.
- El backend confirma el pago con la notificación firmada de Stripe; el regreso del navegador no confirma por sí mismo una compra.
- Tras confirmarse el pago, se guarda la orden y aparece en “Mis pedidos”. Cada conjunto de compra pagado produce su propia orden.
- Para cada compra confirmada se envía un correo con exactamente dos PDF adjuntos: comprobante de pago y copia de la orden.
- El correo de recuperación de contraseña también está incluido. No se incluyen correos promocionales ni de recuperación de carritos.

## Fuera del MVP

- Panel administrativo para administrar cuentas, productos, inventario o archivos.
- Conteo, reserva, ajuste o verificación de existencias.
- Módulo de logística o integración con proveedores de entrega.
- Fusionar los productos de los conjuntos de compra o cobrarlos en una sola operación.
- Páginas independientes de catálogo, categorías o detalle de producto.
- Administración de tarjetas desde el perfil o un flujo separado para guardarlas sin realizar una compra.
- Documentos fiscales; los únicos PDF de compra son el comprobante de pago y la copia de la orden.
- Correos de marketing y de recuperación de carrito.

## Criterios para considerar terminado el MVP

- La landing presenta los productos activos y el aviso de edad cumple el flujo definido, sin depender del consentimiento de cookies.
- El registro valida fecha de nacimiento y mayoría de edad; inicio de sesión, cierre de sesión, recuperación de contraseña y edición de información personal funcionan de extremo a extremo.
- Un visitante puede preparar un carrito; al autenticarse, el conjunto invitado se conserva junto al carrito de cuenta sin mezclarse. Cada conjunto muestra su total, se paga por separado y produce una orden independiente.
- Los productos activos se pueden comprar usando su precio vigente, sin control de existencias ni reserva de inventario.
- Stripe confirma cada pago mediante su notificación firmada; la orden aparece en “Mis pedidos” y se envía el correo con exactamente los dos PDF acordados.
- Los criterios anteriores están cubiertos por los contratos de módulo y validados con las pruebas y verificaciones de aceptación correspondientes. No quedan flujos incluidos representados solo por pantallas incompletas o respuestas simuladas.
