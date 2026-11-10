# Stripe Checkout y webhooks

La API crea Checkout Sessions y sólo marca un pedido como pagado al recibir un webhook con firma válida. Volver del Checkout al frontend muestra el estado, pero no confirma por sí mismo la compra. El [contrato de la fase 06](../../contracts/06-CHECKOUT-ORDERS.md) describe los datos y las transiciones del pedido.

## Desarrollo local: Stripe CLI

1. Crea o abre una cuenta de Stripe en **modo de prueba**. Copia su clave secreta `sk_test_…` a `STRIPE_SECRET_KEY` en `.env`.
2. Levanta Compose, aplica migraciones y carga productos locales como indica [Desarrollo local](../docker/COMPOSE.md).
3. Instala Stripe CLI, ejecuta `stripe login` y deja activa esta terminal:

```bash
stripe listen \
  --events=checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired \
  --forward-to http://localhost:4000/api/webhooks/stripe
```

Los cuatro eventos corresponden a los que procesa `backend/src/checkout/checkout-service.js`. La CLI reenvía eventos desde Stripe a la API local; no hace falta crear un endpoint público en el Dashboard para este caso. [Referencia de Stripe CLI](https://docs.stripe.com/cli/listen).

4. Copia el `whsec_…` que muestra **ese listener** a `STRIPE_WEBHOOK_SECRET` en `.env` y recrea el backend:

```bash
docker compose up --detach --force-recreate backend
```

5. Haz una compra con una [tarjeta de prueba de Stripe](https://docs.stripe.com/testing). Mantén la CLI abierta hasta que llegue el evento. Comprueba la entrega en la terminal, el pedido en **Mis pedidos**, la limpieza de los artículos pagados del carrito y el correo con PDF en Mailpit. Reintentar un mismo evento no debe duplicar el pedido ni el trabajo de correo.

Cada vez que uses un listener o cuenta distintos, compara su secreto de firma con el `.env` activo. `STRIPE_SECRET_KEY` autentica llamadas a la API de Stripe; `STRIPE_WEBHOOK_SECRET` verifica eventos entrantes. No son intercambiables. Si el Checkout no muestra imágenes, usa un origen HTTPS público en `STRIPE_MEDIA_BASE_URL` según [Medios](R2.md).

## Staging en Railway

1. Confirma que la API tenga un dominio público HTTPS y que `GET /health` responda.
2. En Stripe **modo de prueba**, abre Workbench → Webhooks → **Create an event destination**. Selecciona **Your account** y formato **Snapshot**; el handler del proyecto consume el objeto de la sesión incluido en el evento.
3. Selecciona `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` y `checkout.session.expired`. Continúa, selecciona **Webhook endpoint** y usa `https://<dominio-publico-api>/api/webhooks/stripe` como URL. [Creación del destino](https://docs.stripe.com/webhooks).
4. Copia el secreto `whsec_…` de **ese endpoint del Dashboard** a `STRIPE_WEBHOOK_SECRET` del servicio API de staging. Usa `sk_test_…` como `STRIPE_SECRET_KEY`. Despliega la API con las variables actualizadas.
5. Haz una compra de prueba y revisa en Stripe el intento de entrega, respuesta del webhook, pedido, carrito y trabajo de correo. El worker y Resend deben estar configurados para comprobar la última parte.

El secreto del endpoint publicado es distinto del que entrega la Stripe CLI. Railway recibe directamente los eventos en su dominio público, así que el listener local no participa en este recorrido. [Webhooks de Stripe](https://docs.stripe.com/webhooks).

## Tarifas y límites de uso

El modo <code>sk_test_…</code> permite validar Checkout y webhooks sin cobrar pagos reales. En la tarifa estándar de México, el costo publicado es por transacción exitosa; revisa la tarifa aplicable al método de pago antes de producción en [Stripe México](https://stripe.com/mx/pricing).

Los límites de velocidad de la API restringen el ritmo de solicitudes y pueden devolver HTTP 429; no establecen un tope monetario de gasto ni un límite de ventas. Esta integración no configura un tope financiero mensual en Stripe. Si el negocio requiere restringir ventas por presupuesto, inventario o volumen, debe decidirse y documentarse como regla comercial separada. No confundir esos límites con el control de tráfico de API. [Límites de la API de Stripe](https://docs.stripe.com/rate-limits).

## Producción y fallos frecuentes

Producción necesita claves <code>sk_live_…</code>, un endpoint propio, su propio <code>whsec_…</code> y precios comerciales finales aprobados por el cliente. Los precios actuales son los correctos para el MVP y las pruebas de staging, pero no autorizan ventas reales hasta esa aprobación. No copies secretos de staging ni cargues el SQL local como catálogo de producción.

| Síntoma | Revisión |
|---|---|
| `400` por firma | Compara `STRIPE_WEBHOOK_SECRET` con el listener o endpoint que envió ese evento; comprueba que la ruta recibe el cuerpo crudo. |
| El navegador regresa pero el pedido sigue pendiente | Revisa que el listener local siga activo o que Stripe registre entrega exitosa al dominio de Railway. |
| No llegan eventos | Comprueba modo test/live, URL pública, puerto local y lista de eventos suscritos. |
| Compra confirmada sin correo | Revisa el worker y sus trabajos; el pago y el envío de correo son pasos distintos. |
| El carrito conserva artículos pagados | Comprueba la entrega del webhook y la sesión de la cuenta. El backend conserva las líneas modificadas mientras el Checkout estaba abierto; consulta el [contrato de carrito](../../contracts/05-CARTS.md). |
| Imágenes ausentes sólo en Checkout | Revisa `STRIPE_MEDIA_BASE_URL`; Stripe no puede leer `localhost` o una IP LAN. |
