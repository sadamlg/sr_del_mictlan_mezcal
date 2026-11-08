# Servicios y costos

Tarifas revisadas el **29 de octubre de 2026** en documentación y páginas oficiales. USD salvo donde se indica MXN. Los proveedores pueden cambiarlas; vuelve a consultar antes de contratar. El estado de staging refleja las pruebas confirmadas por el responsable ese día y no sustituye una consulta actual a las cuentas externas.

| Servicio | Estado en el proyecto | Precio publicado y uso |
|---|---|---|
| **Cloudflare Free** | Configuración de dominio aún externa | US$0/mes; DNS sin cargo. El dominio no está incluido. Proxy/CDN, TLS y controles web dependen de zona y registros configurados. [DNS](https://developers.cloudflare.com/dns/faq/), [proxy](https://developers.cloudflare.com/dns/proxy-status/), [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/) |
| **Cloudflare R2 Standard** | Bucket no productivo y medios públicos de desarrollo listos | 10 GB-mes, 1 millón de operaciones Clase A y 10 millones Clase B gratis al mes; después US$0.015/GB-mes, US$4.50/millón A y US$0.36/millón B. El egreso es gratuito. [Tarifas](https://developers.cloudflare.com/r2/pricing/) |
| **Railway Hobby** | Staging desplegado y usado para una compra de prueba; producción pendiente | US$5/mes incluyen US$5 de uso. Recursos publicados: CPU US$20/vCPU-mes, RAM US$10/GB-mes, egreso US$0.05/GB y volumen US$0.15/GB-mes. Hobby permite hasta 5 GB de volumen. [Planes](https://docs.railway.com/pricing/plans), [facturación](https://docs.railway.com/pricing/understanding-your-bill) |
| **PostgreSQL, frontend, API y worker en Railway** | Recorrido de staging comprobado manualmente; producción pendiente | Su costo depende de uso medido de CPU, RAM, red y volumen. No hay costo mensual real estimable sin medir el entorno desplegado. |
| **Resend** | Correo de compra con PDF recibido en la prueba de staging; producción pendiente. | Free: US$0 hasta 3,000 correos/mes y 100/día. Pro: US$20/mes por 50,000 correos, luego US$0.90 por cada 1,000. [Precios](https://resend.com/pricing) |
| **Stripe Checkout** | Checkout y webhook implementados; se prueba en modo de prueba | Sin mensualidad ni instalación estándar. Para tarjeta nacional exitosa en México: 3.6% + MXN 3, antes de IVA. Una venta de MXN 1,000 implica MXN 39 de comisión antes de IVA. Pueden aplicar cargos por tarjeta internacional, conversión o meses sin intereses. [Stripe México](https://stripe.com/mx/pricing) |

## Railway: controles y respaldos

La suscripción Hobby es US$5 mínimo por ciclo; el crédito incluido cubre los primeros US$5 de recursos y no se acumula. Un consumo de US$3 deja el mínimo en US$5; uno de US$8 eleva el total a US$8. Los servicios encendidos pueden consumir CPU o RAM aunque haya poco tráfico. Usa la red privada entre servicios cuando esté disponible para evitar egreso público innecesario.

No se ha verificado un límite de gasto configurado para Railway. Antes de desplegar, revisa sus controles de costos y decide un tope que considere la interrupción de servicios si se alcanza. [Control de costos](https://docs.railway.com/pricing/cost-control)

Railway factura los backups incrementales por el almacenamiento exclusivo que retienen, a la tarifa de volumen y prorrateado por minuto; no existe una tarifa fija por snapshot. La programación y retención se configuran en el servicio. El snapshot diario con seis días de retención es una propuesta operativa, **no una configuración confirmada**. [Backups](https://docs.railway.com/volumes/backups), [planes y volúmenes](https://docs.railway.com/pricing/plans)

## Alcance de la capa pública de Cloudflare

El proxy, la CDN y los controles de Cloudflare se aplican a los hostnames HTTP/S configurados como **Proxied**; un registro **DNS-only** resuelve directamente al origen. La protección DDoS, las reglas WAF y Bot Fight Mode son funciones distintas: revisa sus requisitos, disponibilidad y activación vigentes antes de configurar el entorno. [Estados de proxy](https://developers.cloudflare.com/dns/proxy-status/), [DDoS](https://developers.cloudflare.com/ddos-protection/about/), [WAF](https://developers.cloudflare.com/waf/) y [Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/).

## Supuestos

- Los precios de Stripe ejemplifican tarjeta nacional y no incluyen IVA ni cargos adicionales.
- El precio de dominio, impuestos y uso que exceda cuotas gratuitas no están incluidos en un total mensual.
- Estos datos sirven para comparar opciones; no son cotización ni predicción de factura. El gasto real depende de tráfico, recursos y retención elegida.
