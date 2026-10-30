# Alcance funcional del MVP

**Estado:** alcance objetivo aprobado. Este documento define qué debe incluir la primera versión; el estado de implementación se mantiene en [ROADMAP.md](ROADMAP.md) y los detalles técnicos, en los [contratos de módulo](contracts/).

## Objetivo

Presentar la marca y su catálogo, permitir preparar compras como invitado o cliente, cobrar con Stripe Checkout y consultar pedidos desde una cuenta.

## Incluido

### Landing y catálogo

- Landing con navegación, escaparate, aviso de mayoría de edad y contador de sesiones de navegador. El contador no identifica personas ni guarda IP.
- El aviso aparece cuando la sección de mezcales entra en pantalla. “Entrar al Mictlán” recuerda la respuesta en `sessionStorage` de esa pestaña; “No, salir del sitio” abre Google en otra pestaña y deja la original abierta sin conceder acceso al escaparate. Es una declaración, no una verificación de identidad ni un consentimiento de cookies.
- Productos, precios, disponibilidad y referencias de medios se administran manualmente en PostgreSQL; no hay panel administrativo, inventario ni carga de archivos.
- La tienda sólo vende productos activos. Antes de cobrar, el backend vuelve a comprobar que sigan activos y toma el precio vigente.
- El alcance de contenido comprende la landing y el catálogo. Agregar medios por sí solo no amplía el alcance funcional.

### Cuentas

- Registro, confirmación de correo, inicio/cierre de sesión, recuperación y cambio de contraseña, actualización de perfil y cambio de correo confirmado.
- El registro solicita nombre, apellidos, correo, fecha de nacimiento y dirección en México. La fecha debe acreditar al menos 18 años; el código postal debe tener cinco dígitos. No se consulta un servicio externo de direcciones.
- La cuenta sólo se activa al confirmar el correo. Si el registro nació durante el checkout, confirmar el correo inicia sesión y continúa al resumen de compra; en los demás casos vuelve a la tienda.
- La cuenta contiene las secciones **Información personal**, **Contraseña** y **Mis pedidos**. Sólo la información personal permite editar los datos del perfil; la contraseña tiene su propio formulario.
- Registro e inicio de sesión deberán protegerse con Cloudflare Turnstile validado también por el backend. **Pendiente:** actualmente Turnstile no está integrado; se incluye en la fase 12 del [roadmap](ROADMAP.md).

### Carrito y checkout

- El carrito de invitado se guarda en el mismo navegador durante 30 días desde su última actividad. Al iniciar sesión o registrarse, sus cantidades se suman de forma idempotente al carrito de la cuenta; el máximo es 99 por producto.
- El checkout requiere sesión. Su resumen permite editar destinatario y cantidades, muestra imágenes del catálogo y tarjetas guardadas por Stripe (sólo marca, últimos cuatro y vencimiento; el nombre se muestra si Stripe lo devuelve).
- Los datos de envío del resumen pertenecen a esa compra y no cambian el perfil. La tarjeta se introduce o selecciona en Stripe Checkout; la aplicación no almacena número completo, CVC ni identificadores de método de pago.
- Stripe Checkout aloja el pago. Sólo un webhook con firma válida confirma el pago; volver al sitio no basta.
- “Mis pedidos” muestra compras pagadas. “Volver a pedir” agrega sus artículos al carrito y abre directamente el resumen de compra.

### Correo de compra

- Una compra confirmada genera un correo con un PDF de detalle del pedido, que reúne datos de envío, productos e importes pagados. El [contrato de la fase 07](contracts/07-PURCHASE-EMAIL-PDF.md) define el comportamiento; el [roadmap](ROADMAP.md) separa su implementación local de la configuración externa de Resend.
- También se incluyen los correos de confirmación de registro/cambio de correo y recuperación de contraseña. En desarrollo se capturan con Mailpit.

## Fuera del MVP

- Panel administrativo, inventario, reserva de existencias, logística e integración con proveedores de entrega.
- Páginas independientes de categorías o detalle de producto.
- Administración de tarjetas desde el perfil o guardar una tarjeta fuera de una compra.
- Documentos fiscales, marketing y recuperación de carritos.

## Criterios de aceptación

- El registro, autenticación y sus enlaces de correo funcionan de extremo a extremo y protegen los datos privados.
- Un visitante puede preparar un carrito; al autenticarse se combina sin duplicar transferencias.
- Los artículos activos se cobran al precio vigente y cada pago confirmado genera un pedido independiente, visible sólo para su titular.
- Ninguna compra se confirma por el retorno del navegador; no se almacena el número completo de tarjeta, CVC ni datos de inventario.
- El MVP funcional incluye el correo de compra y el PDF único de detalle de pedido. La aceptación de staging y la preparación de producción se detallan en las fases 12 y 13 del [roadmap](ROADMAP.md).
