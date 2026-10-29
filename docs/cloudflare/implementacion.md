# Cloudflare: estado y configuración pendiente

Este documento separa lo que ya funciona de lo que depende de dominios y cuentas externas. El código del repositorio no permite confirmar el estado de despliegues, DNS ni TLS.

## Estado actual

- Las doce imágenes públicas de desarrollo están cargadas en R2. Claves, URLs y variables de entorno están en la [guía de R2](r2.md).
- El frontend y la API usan URLs locales en Compose. El sistema no requiere DNS ni proxy de Cloudflare para funcionar localmente.
- No hay configuración versionada de Railway, DNS, dominio personalizado ni hostname de producción. Staging y producción se preparan en las fases 08 y 09 del [roadmap](../ROADMAP.md).

## Cuando exista un dominio de staging

1. Verifica los registros DNS actuales —incluidos correo y verificación— antes de cambiar los *nameservers* a Cloudflare. [Inicio de DNS](https://developers.cloudflare.com/dns/get-started/), [cambio de nameservers](https://developers.cloudflare.com/dns/nameservers/update-nameservers/).
2. Añade a Railway los hostnames de tienda y API. Copia los registros de verificación CNAME/TXT que entregue Railway en Cloudflare. [Dominios personalizados](https://docs.railway.com/networking/domains/working-with-domains).
3. Configura HTTPS y valida los hostnames en staging antes de activar el proxy. El ajuste TLS depende del origen; Railway documenta su configuración recomendada para Cloudflare. Cloudflare recomienda Full (Strict) sólo si el certificado del origen cumple sus requisitos. Verifica ambas guías vigentes antes de cambiar TLS: [Railway](https://docs.railway.com/networking/domains/working-with-domains), [Cloudflare](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
4. Conecta el hostname de medios a un bucket R2 no productivo, separado de producción. Mantén PostgreSQL y el worker en la red privada; publica sólo los servicios que reciben tráfico externo.
5. Prueba tienda, API, medios, Stripe en modo de prueba y webhook. Evalúa WAF y Bot Fight Mode por separado; habilitar el proxy no activa automáticamente todos los controles.

## Producción

Usa secretos y recursos independientes; prepara un bucket R2 y hostname de medios propios, y no dependas de `r2.dev`. Aplica DNS y TLS sólo cuando el dominio real esté disponible. No publiques PostgreSQL ni el worker.

Los nombres de dominio, buckets, políticas de caché y credenciales pertenecen a la configuración de cada cuenta y no se guardan en este documento. La carga de medios del MVP es manual; si la aplicación necesita escribir en R2, primero define permisos y flujo de carga.
