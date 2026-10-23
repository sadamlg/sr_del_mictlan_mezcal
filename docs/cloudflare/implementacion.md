# Mapa de implementación de Cloudflare

> Guía para ordenar la integración de R2 y la capa pública de Cloudflare. Los nombres de dominio, buckets y credenciales se definen cuando se prepare cada entorno; esta guía no implica que exista una cuenta o recurso provisionado. Verifica las instrucciones del proveedor al ejecutarlas, porque sus paneles y requisitos pueden cambiar.

## Qué se configura en cada servicio

Una cuenta de Cloudflare puede administrar la zona DNS del dominio, el proxy/CDN y R2 desde el mismo dashboard. R2 se activa por separado; agregar un dominio no crea buckets ni habilita su acceso público. [Inicio de R2](https://developers.cloudflare.com/r2/get-started/)

El dominio puede estar registrado en cualquier registrador. Para la configuración habitual de Cloudflare Free, se agrega la zona a Cloudflare y se cambian los *nameservers* en el registrador. Antes de ese cambio hay que revisar y copiar los registros DNS existentes, especialmente los de correo y verificación. [Configuración DNS principal](https://developers.cloudflare.com/dns/get-started/), [cambio de nameservers](https://developers.cloudflare.com/dns/nameservers/update-nameservers/)

Cloudflare administra la entrada pública y los medios; Railway ejecuta Next.js, Express, PostgreSQL y el worker. Las conexiones internas entre servicios Railway —por ejemplo, Next.js a Express durante SSR y Express a PostgreSQL— permanecen dentro de la red privada de Railway.

## Orden recomendado por fase

### 1. Preparar los medios

- Identificar los archivos destinados a visitantes y mantener privados los que no deban ser públicos.
- Acordar variantes, nombres y metadatos antes de una carga masiva.
- Guardar en PostgreSQL una clave estable del objeto y sus metadatos, no una URL temporal. La aplicación usará `MEDIA_BASE_URL` como base pública configurable por entorno; no mantendrá un alias paralelo `R2_PUBLIC_BASE_URL`.

**Criterio de avance:** está claro qué medios pueden ser públicos y cómo se referenciarán desde el catálogo.

### 2. Crear la cuenta y preparar R2 para desarrollo/staging

Este paso ocurre durante la fase 03 —landing, catálogo y medios—, justo antes de integrar R2 con archivos reales. La persona responsable crea una cuenta bajo control del proyecto y la protege con autenticación multifactor. No se crea la cuenta ni se provisionan recursos durante la fase documental actual.

- Activar R2 y crear primero el bucket de desarrollo/staging. Los buckets de producción se preparan en su fase correspondiente.
- Cargar manualmente los archivos desde el dashboard mientras esa sea la forma de operación del catálogo. No hacen falta credenciales de escritura de R2 en la aplicación para una carga manual.
- Publicar sólo los archivos destinados a visitantes; no alojar documentos privados en un bucket público.
- `r2.dev` puede usarse para desarrollo o staging, pero no para producción. No configurar DNS ni un dominio personalizado como parte de esta integración local. [Buckets públicos y URL de desarrollo](https://developers.cloudflare.com/r2/buckets/public-buckets/)

La guía de [R2 para medios y catálogo](r2.md) cubre referencias, visibilidad y verificación. Consulta también [Servicios y costos](../servicios-y-costos.md) antes de activar servicios para un entorno real.

**Criterio de avance:** la aplicación puede mostrar medios de prueba desde el entorno no productivo usando claves estables y `MEDIA_BASE_URL`, sin guardar URLs temporales en PostgreSQL ni exponer credenciales.

### 3. Configurar medios en staging

- Mantener el bucket y los datos de staging separados de producción.
- Configurar `MEDIA_BASE_URL` con el origen público real de los medios de staging; no fijar un dominio supuesto en el repositorio.
- Si el catálogo continúa con carga manual, no agregar credenciales de escritura al backend.
- Al inicio se puede validar con el dominio público de Railway. La configuración de DNS y dominios personalizados de staging pertenece al paso 4, no a la integración local de R2.

**Criterio de avance:** el catálogo de staging muestra los medios previstos por HTTPS y no depende del bucket ni de las credenciales de producción.

### 4. Configurar la capa pública de Cloudflare en staging

Cuando existan un dominio disponible y servicios desplegados en Railway:

1. Agregar la zona a la cuenta de Cloudflare, revisar los registros importados y activar la zona en el registrador.
2. En Railway, agregar un dominio personalizado al frontend y otro al backend si el navegador llamará directamente a la API. Railway entrega los valores de verificación `CNAME` y `TXT`; copiarlos tal cual al DNS de Cloudflare. [Dominios personalizados de Railway](https://docs.railway.com/networking/domains/working-with-domains)
3. Activar el proxy de Cloudflare en los registros HTTP/S de la tienda y la API cuando se valide la integración. Mantener separados los registros que no transporten tráfico web, como los de correo. [Cuándo usar el proxy](https://developers.cloudflare.com/dns/proxy-status/use-cases/)
4. Conectar el hostname de medios de staging al bucket de staging desde R2; ese hostname apunta a R2, no a Railway.
5. Probar HTTPS, tienda, API, medios, checkout y webhook de Stripe. Revisar WAF y Bot Fight Mode como controles distintos; no asumir que activar el proxy habilita cada control.

**Nota de TLS para Railway:** su guía de integración con Cloudflare actualmente indica el modo **Full** para dominios proxied y advierte contra **Full (Strict)** para esa configuración. Cloudflare recomienda Full (Strict) cuando el certificado del origen cumple sus requisitos. Como la indicación depende del origen Railway, comprobar la guía vigente y probarla en staging antes de aplicarla en producción. [Configuración Cloudflare de Railway](https://docs.railway.com/networking/domains/working-with-domains), [modos TLS de Cloudflare](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

**Criterio de avance:** los hostnames de staging sirven la tienda, API y medios por HTTPS; los flujos críticos pasan con configuración de prueba y los medios siguen aislados de producción.

### 5. Preparar medios y servicios de producción

- Crear el bucket de producción separado y configurar su origen público mediante `MEDIA_BASE_URL` para ese entorno.
- Usar un dominio personalizado para los medios públicos de producción; `r2.dev` no es una URL de producción.
- Conectar los hostnames de tienda y API a sus servicios Railway y configurar DNS/TLS sólo cuando el dominio real esté disponible. Esta fase sí puede incluir cambios de DNS; la preparación local de R2 no.
- Mantener PostgreSQL y el worker sin hostname público; exponer sólo los servicios que reciben tráfico externo.
- Usar secretos y recursos distintos de staging, almacenados en la configuración privada del proveedor.

**Criterio de cierre:** producción no depende de `r2.dev`; los servicios públicos y medios usan los hostnames configurados para ese entorno y la configuración se valida con los procedimientos de operación y recuperación documentados.

## Decisiones para la fase correspondiente

No se fijan aquí el dominio definitivo, los nombres de buckets, la política de caché ni credenciales. La carga de medios de este MVP es manual; si en el futuro se propone que la aplicación escriba en R2, ese cambio requiere definir y aprobar el flujo y sus permisos antes de añadir credenciales al backend.
