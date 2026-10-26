# Mapa de implementación de Cloudflare

> Este documento resume la función de Cloudflare y el orden de su configuración pública. La preparación de R2, el inventario de medios y su integración tienen una sola guía: [Cloudflare R2 para los medios](r2.md). Verifica la documentación vigente del proveedor al configurar cada cuenta.

## Qué se configura en cada servicio

Cloudflare puede administrar la zona DNS, el proxy/CDN y R2 desde una cuenta. R2 se activa por separado; agregar un dominio no crea buckets ni habilita su acceso público. [Inicio de R2](https://developers.cloudflare.com/r2/get-started/)

El dominio puede estar registrado en cualquier registrador. Para la configuración habitual de Cloudflare Free, se agrega la zona a Cloudflare y se cambian los *nameservers* en el registrador. Antes de hacerlo, revisa y copia los registros DNS existentes, especialmente los de correo y verificación. [Configuración DNS principal](https://developers.cloudflare.com/dns/get-started/), [cambio de nameservers](https://developers.cloudflare.com/dns/nameservers/update-nameservers/)

Cloudflare administra la entrada pública y los medios; Railway ejecuta Next.js, Express, PostgreSQL y el worker. Las conexiones internas entre servicios Railway —por ejemplo, Next.js a Express durante SSR y Express a PostgreSQL— permanecen dentro de su red privada.

## Orden por fase

### 1. Preparar R2 para desarrollo/staging — completado

La cuenta, el bucket no productivo, la URL pública de desarrollo y la integración de las doce imágenes ya están preparados. La [guía dedicada de R2](r2.md) conserva los pasos reproducibles y el estado detallado. La configuración pública de staging y el bucket de producción quedan para sus fases correspondientes.

La integración local de R2 no requiere cambios DNS ni dominio personalizado. La carga del MVP es manual; no agregues credenciales de escritura a la aplicación. Consulta [Servicios y costos](../servicios-y-costos.md) antes de activar servicios para un entorno real.

### 2. Configurar la capa pública de Cloudflare en staging

Cuando exista un dominio disponible y los servicios estén desplegados en Railway:

1. Agrega la zona a Cloudflare, revisa los registros importados y actívala en el registrador.
2. En Railway, agrega un dominio personalizado al frontend y otro al backend si el navegador llamará directamente a la API. Railway entrega los valores de verificación <code>CNAME</code> y <code>TXT</code>; cópialos al DNS de Cloudflare. [Dominios personalizados de Railway](https://docs.railway.com/networking/domains/working-with-domains)
3. Activa el proxy de Cloudflare en los registros HTTP/S de la tienda y la API cuando se valide la integración. Mantén separados los registros que no transporten tráfico web, como los de correo. [Cuándo usar el proxy](https://developers.cloudflare.com/dns/proxy-status/use-cases/)
4. Conecta el hostname de medios de staging al bucket de staging desde R2; ese hostname apunta a R2, no a Railway.
5. Prueba HTTPS, tienda, API, medios, checkout y webhook de Stripe. Revisa WAF y Bot Fight Mode como controles distintos; no asumas que activar el proxy habilita cada control.

**Nota de TLS para Railway:** su guía de integración con Cloudflare actualmente indica el modo **Full** para dominios proxied y advierte contra **Full (Strict)** para esa configuración. Cloudflare recomienda Full (Strict) cuando el certificado del origen cumple sus requisitos. Como la indicación depende del origen Railway, comprueba la guía vigente y pruébala en staging antes de aplicarla en producción. [Configuración Cloudflare de Railway](https://docs.railway.com/networking/domains/working-with-domains), [modos TLS de Cloudflare](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

**Criterio de avance:** los hostnames de staging sirven la tienda, API y medios por HTTPS; los flujos críticos pasan con configuración de prueba y los medios siguen aislados de producción.

### 3. Preparar Cloudflare para producción

- Crear un bucket de producción separado y configurar su origen público mediante <code>MEDIA_BASE_URL</code>.
- Usar un dominio personalizado para los medios públicos; <code>r2.dev</code> no es una URL de producción.
- Conectar los hostnames de tienda y API a sus servicios Railway y configurar DNS/TLS sólo cuando el dominio real esté disponible. Esta fase sí puede incluir cambios de DNS.
- Mantener PostgreSQL y el worker sin hostname público; exponer sólo los servicios que reciben tráfico externo.
- Usar secretos y recursos distintos de staging, almacenados en la configuración privada del proveedor.

**Criterio de cierre:** producción no depende de <code>r2.dev</code>; los servicios públicos y los medios usan los hostnames de producción y la configuración se valida con los procedimientos de operación y recuperación documentados.

## Decisiones reservadas

El dominio definitivo, los nombres de buckets, la política de caché y las credenciales se definen al preparar cada entorno. La carga del MVP es manual. Si en el futuro la aplicación necesita escribir en R2, primero se debe definir el flujo y sus permisos.
