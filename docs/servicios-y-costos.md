# Servicios y costos

> Tarifas revisadas el 15 de octubre de 2026. Los precios están expresados en USD, salvo donde se indica MXN. Las tarifas y cuotas pueden cambiar; vuelve a consultar las páginas oficiales antes de contratar o ajustar el presupuesto.

## Servicios previstos

| Servicio | Uso en el proyecto | Tarifa y cuotas publicadas |
|---|---|---|
| **Cloudflare Free** | DNS autoritativo; proxy/CDN, TLS y protecciones web para los hostnames configurados como **Proxied**. | **US$0/mes** en el plan Free. Las consultas DNS no tienen cargo. El certificado Universal SSL se emite para el dominio activo en Cloudflare y los registros proxied. El dominio y su registro no están incluidos. [DNS](https://developers.cloudflare.com/dns/faq/), [proxy](https://developers.cloudflare.com/dns/proxy-status/), [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/) |
| **Cloudflare R2 Standard** | Almacenar y entregar imágenes de productos y medios de la landing. | Cuota gratuita mensual de **10 GB-mes**, **1 millón de operaciones Clase A** y **10 millones Clase B**. Después: **US$0.015/GB-mes**, **US$4.50 por millón de operaciones A** y **US$0.36 por millón B**. El egreso desde R2 no tiene cargo. La cuota gratuita aplica al almacenamiento Standard; Cloudflare redondea el uso a la siguiente unidad de facturación. [Precios de R2](https://developers.cloudflare.com/r2/pricing/) |
| **Railway Hobby** | Alojar frontend, backend, PostgreSQL y worker en servicios separados. | **US$5/mes** de suscripción, que incluye **US$5 de uso de recursos**. El uso que excede ese crédito aumenta el total de la factura. Precios publicados: CPU **US$20/vCPU-mes**, RAM **US$10/GB-mes**, egreso **US$0.05/GB** y volúmenes **US$0.15/GB-mes**. [Planes y precios](https://docs.railway.com/pricing/plans), [facturación](https://docs.railway.com/pricing/understanding-your-bill) |
| **PostgreSQL en Railway** | Datos del negocio y registros de trabajos de correo. | Consume CPU, RAM y almacenamiento de volumen según las tarifas de Railway. El límite publicado para Hobby es **5 GB de volumen**. Los respaldos incrementales pueden generar cargos: se factura el tamaño exclusivo de los respaldos, con la misma tarifa de volumen. [Límites de planes](https://docs.railway.com/pricing/plans), [respaldos](https://docs.railway.com/volumes/backups) |
| **Frontend, backend y worker en Railway** | Ejecutar Next.js, Express y el proceso Node.js de correos. | Su consumo de CPU y RAM, así como el egreso de red, forma parte del uso de Railway. Un servicio encendido puede consumir memoria aunque no esté atendiendo solicitudes; el costo de CPU depende de la actividad del proceso. La compilación de imágenes no tiene cargo de recursos. [Cómo entender la factura](https://docs.railway.com/pricing/understanding-your-bill), [precios de recursos](https://docs.railway.com/pricing/plans) |
| **Resend Free** | Enviar correos transaccionales. | **US$0** hasta **3,000 correos al mes** y **100 al día**. Pro cuesta **US$20/mes** por **50,000 correos al mes**; en Pro, los adicionales cuestan US$0.90 por cada 1,000. [Precios de Resend](https://resend.com/pricing) |
| **Stripe Checkout** | Checkout alojado y procesamiento de pagos. | Sin mensualidad ni cuota de instalación estándar. Para una transacción exitosa con tarjeta nacional en México: **3.6% + MXN 3**, antes de IVA. Por ejemplo, una venta de MXN 1,000 genera MXN 39 de comisión antes de IVA. Pueden aplicar cargos adicionales por tarjetas internacionales, conversión de moneda o meses sin intereses. [Precios de Stripe México](https://stripe.com/mx/pricing) |

## Facturación y límite de Railway

La suscripción Hobby se cobra aunque el uso sea bajo: los primeros US$5 de recursos quedan cubiertos por la suscripción. Si el consumo medido es de US$3, la factura base sigue siendo US$5; si llega a US$8, el total de Railway es US$8, no US$13. El crédito incluido se reinicia en cada ciclo y no se acumula. [Planes y precios de Railway](https://docs.railway.com/pricing/plans), [cómo entender la factura](https://docs.railway.com/pricing/understanding-your-bill)

Para limitar el gasto, se configurará un **límite duro de US$20 para el uso de cómputo de Railway**. Cuando se alcanza, Railway desconecta los *workloads* para detener más consumo. Esto interrumpe la tienda, la API, el worker y PostgreSQL hasta que se restablezca el servicio o se cambie el límite. [Control de costos de Railway](https://docs.railway.com/pricing/cost-control)

Las llamadas internas a PostgreSQL deben usar la red privada de Railway para evitar egreso innecesario. Los servicios que permanecen encendidos siguen consumiendo recursos; por eso se medirá el uso real antes de ajustar memoria, CPU o el límite. [Cómo entender la factura](https://docs.railway.com/pricing/understanding-your-bill)

## Alcance de Cloudflare Free

Las funciones de proxy, CDN y protección de Cloudflare se aplican a los registros HTTP/S configurados como **Proxied**. Un registro **DNS-only** resuelve directamente al origen. [Estados de proxy](https://developers.cloudflare.com/dns/proxy-status/)

El plan Free incluye protección DDoS no medida en las capas 3, 4 y 7; en el WAF incluye el Free Managed Ruleset, reglas personalizadas y una regla de rate limiting. Bot Fight Mode también está disponible en Free y debe habilitarse; puede aplicar desafíos a tráfico automatizado. [Protección DDoS](https://developers.cloudflare.com/ddos-protection/about/), [WAF](https://developers.cloudflare.com/waf/), [Bot Fight Mode](https://developers.cloudflare.com/bots/plans/free/)

La protección DDoS de Cloudflare no es un límite de facturación para Railway ni una garantía independiente contra **EDoS**. El hard limit de Railway es el control directo para detener el consumo facturable en esa plataforma. Esta última relación es una inferencia a partir de cómo cada proveedor describe sus protecciones y su facturación.

## Supuestos y exclusiones

- Las cuotas de Cloudflare R2 y Resend se aplican por ciclo mensual y pueden superarse si crece el uso.
- La comisión de Stripe de esta estimación corresponde a tarjetas nacionales exitosas; no incluye IVA ni posibles cargos adicionales por otros tipos de transacción.
- El precio del dominio, impuestos, servicios opcionales y consumos fuera de las cuotas gratuitas no forman parte de un costo fijo total.
- Las tarifas son una referencia de planificación, no una cotización ni un costo mensual garantizado. El gasto de Railway depende del uso medido de cada servicio.
