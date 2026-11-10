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

## Límites de consumo y controles

El comportamiento de límites de abajo se verificó en las guías oficiales el **8 de noviembre de 2026**. No representa una lectura de la configuración privada de las cuentas del proyecto.

| Servicio | Control publicado | Efecto y estado que debe verificarse |
|---|---|---|
| **R2 Standard** | Cuota mensual incluida de 10 GB-mes, 1 millón de operaciones Clase A y 10 millones Clase B; el egreso no se cobra. | El exceso de almacenamiento/operaciones puede generar cargos. La alerta de presupuesto de Cloudflare es **por cuenta** y sólo envía correo; no es un límite duro de R2. Revisar cuotas y alerta activa en [Usage y alertas](https://developers.cloudflare.com/billing/manage/budget-alerts/). |
| **Cloudflare Images** | Producto opcional, distinto de R2 y no configurado en este repo. El plan Images Free incluye 5,000 transformaciones únicas al mes. | Al exceder el límite, las variantes existentes en caché siguen disponibles, pero las nuevas transformaciones pueden devolver error 9422; no asumir que se cobrará automáticamente. Ver [límites y precios](https://developers.cloudflare.com/images/pricing/). |
| **Railway** | Límites de cómputo configurables por workspace: alerta suave y límite duro. | La alerta notifica por correo; el límite duro apaga todos los workloads del workspace. El umbral no está verificado para la cuenta del proyecto; elegirlo según presupuesto aprobado. |
| **Resend Free** | Hasta 3,000 correos al mes y 100 al día; el plan Free no requiere información de facturación. | Confirmar plan/uso en el dashboard. En planes pagados, los sobreconsumos transaccionales son opt-in y cada bloque de 1,000 puede cobrar a la tarjeta registrada. |
| **Stripe Standard** | Comisión por transacción exitosa; los rate limits de API controlan solicitudes por tiempo. | No confundir 429 o límites de velocidad con un tope monetario. Esta integración no configura un máximo de gasto; staging debe usar <code>sk_test_…</code>. |

Para los pasos reproducibles, revisa [R2](R2.md), [Railway](RAILWAY.md), [Resend](RESEND.md) y [Stripe](STRIPE.md). Los valores, cuotas y funciones del proveedor pueden cambiar: consulta las fuentes oficiales antes de configurar una cuenta nueva.

## Railway: controles y respaldos

La suscripción Hobby es US$5 mínimo por ciclo; el crédito incluido cubre los primeros US$5 de recursos y no se acumula. Un consumo de US$3 deja el mínimo en US$5; uno de US$8 eleva el total a US$8. Los servicios encendidos pueden consumir CPU o RAM aunque haya poco tráfico. Usa la red privada entre servicios cuando esté disponible para evitar egreso público innecesario.

Railway documenta una alerta suave y un límite duro de cómputo a nivel de workspace. El límite duro puede apagar todos los workloads al alcanzarse. La configuración activa de este proyecto no se ha leído; consulta [Control de costos](https://docs.railway.com/pricing/cost-control) y el panel Usage antes de producción.

Railway factura los backups incrementales por el almacenamiento exclusivo que retienen, a la tarifa de volumen y prorrateado por minuto; no existe una tarifa fija por snapshot. La programación y retención se configuran en el servicio. El snapshot diario con seis días de retención es una propuesta operativa, **no una configuración confirmada**. [Backups](https://docs.railway.com/volumes/backups), [planes y volúmenes](https://docs.railway.com/pricing/plans)

## Alcance de la capa pública de Cloudflare

El proxy, la CDN y los controles de Cloudflare se aplican a los hostnames HTTP/S configurados como **Proxied**; un registro **DNS-only** resuelve directamente al origen. La protección DDoS, las reglas WAF y Bot Fight Mode son funciones distintas: revisa sus requisitos, disponibilidad y activación vigentes antes de configurar el entorno. [Estados de proxy](https://developers.cloudflare.com/dns/proxy-status/), [DDoS](https://developers.cloudflare.com/ddos-protection/about/), [WAF](https://developers.cloudflare.com/waf/) y [Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/).

## Supuestos

- Los precios de Stripe ejemplifican tarjeta nacional y no incluyen IVA ni cargos adicionales.
- El precio de dominio, impuestos y uso que exceda cuotas gratuitas no están incluidos en un total mensual.
- Estos datos sirven para comparar opciones; no son cotización ni predicción de factura. El gasto real depende de tráfico, recursos y retención elegida.
