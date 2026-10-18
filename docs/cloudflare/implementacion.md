# Mapa de implementación de Cloudflare

> Guía general para ordenar cuándo incorporar R2 y cuándo poner Cloudflare delante de los servicios públicos. No fija todavía nombres de dominio, estructura final de buckets ni la interfaz de carga; esas decisiones se toman cuando el proyecto llegue a cada fase. Verifica las instrucciones del proveedor al ejecutarlas, porque sus paneles y requisitos pueden cambiar.

## Qué se configura en cada servicio

Una sola cuenta de Cloudflare puede administrar la zona DNS del dominio, el proxy/CDN y R2 desde el mismo dashboard. R2 aparece en **Storage & databases → R2**, pero requiere activarse por separado en la cuenta; agregar un dominio no crea buckets ni habilita su acceso público. [Inicio de R2](https://developers.cloudflare.com/r2/get-started/)

El dominio puede estar registrado en cualquier registrador. Para la configuración habitual de Cloudflare Free, se agrega la zona a Cloudflare y se cambian los *nameservers* en el registrador. Antes de ese cambio hay que revisar y copiar los registros DNS existentes, especialmente los de correo y verificación. [Configuración DNS principal](https://developers.cloudflare.com/dns/get-started/), [cambio de nameservers](https://developers.cloudflare.com/dns/nameservers/update-nameservers/)

Cloudflare administra la entrada pública y los medios; Railway sigue ejecutando Next.js, Express, PostgreSQL y el worker. Las conexiones internas entre servicios Railway —por ejemplo, Next.js a Express durante SSR y Express a PostgreSQL— permanecen dentro de la red privada de Railway.

## Orden recomendado por fase

### 0. Definir los medios antes de cargarlos en volumen

- Separar los archivos que serán públicos —por ejemplo, imágenes del catálogo, identidad visual y landing— de cualquier archivo que deba permanecer privado.
- Acordar variantes, nombres y metadatos básicos antes de una carga masiva.
- **Recomendación para PostgreSQL:** guardar una clave estable del objeto y sus metadatos, y construir la URL pública con una base por entorno. Así el catálogo no queda atado a una URL temporal de desarrollo.

**Puerta para avanzar:** saber qué archivos se publican y cómo se identificarán desde el catálogo.

### 1. Crear la cuenta y probar R2

- Usar una cuenta de Cloudflare bajo control del proyecto y protegerla con autenticación multifactor.
- Activar R2 desde el dashboard. No hace falta comprar el dominio a Cloudflare.
- Crear primero un bucket de prueba o de *staging* y subir unos pocos archivos representativos.
- Si el dominio todavía no está listo, `r2.dev` puede servir para pruebas temporales; no usarlo como URL de producción. [Buckets públicos y URL de desarrollo](https://developers.cloudflare.com/r2/buckets/public-buckets/)

El paso a paso de buckets, publicación y conexión con la aplicación está en [R2 para medios y catálogo](r2.md). Revisa también las cuotas y tarifas en [Servicios y costos](../servicios-y-costos.md).

### 2. Integrar el manejo de medios en el ecommerce

- Definir cómo la aplicación convertirá la clave guardada en PostgreSQL en la URL pública de cada archivo.
- Decidir en la fase de catálogo si la carga inicial se hará manualmente o con una herramienta repetible. La interfaz para que un administrador cargue medios desde el ecommerce puede diseñarse después.
- Si Express necesita subir o modificar objetos, sus credenciales de R2 se guardan como variables privadas del backend; no se publican en el navegador ni en el repositorio.

**Puerta para avanzar:** desde un entorno local se puede mostrar un archivo de prueba a partir de su referencia, y una carga no expone credenciales.

### 3. Conectar Railway *staging*

- Crear un bucket y credenciales para *staging*, separados de producción.
- Configurar en Railway las variables que realmente use el backend para cargar archivos y la base pública de medios que use el frontend.
- Al inicio se puede validar con el dominio público de Railway. Para probar la capa de Cloudflare con más fidelidad, se necesita un subdominio de *staging* y completar el paso siguiente.

**Puerta para avanzar:** el catálogo de *staging* muestra los medios esperados, los objetos públicos se leen por HTTPS y el entorno no usa el bucket ni las credenciales de producción.

### 4. Configurar la capa pública de Cloudflare en *staging*

Cuando exista un dominio y una aplicación desplegada en Railway:

1. Agregar la zona a la cuenta Cloudflare, revisar los registros importados y activar la zona en el registrador.
2. En Railway, agregar un dominio personalizado al servicio de frontend y otro al backend si el navegador llamará directamente a la API. Railway entrega los valores de verificación `CNAME` y `TXT`; deben copiarse tal cual al DNS de Cloudflare. El `TXT` verifica el dominio y se deja como registro DNS; el `CNAME` enruta el tráfico al servicio. [Dominios personalizados de Railway](https://docs.railway.com/networking/domains/working-with-domains)
3. Activar el proxy de Cloudflare en los registros HTTP/S de la tienda y la API cuando se valide la integración. Mantener separados los registros que no transporten tráfico web, como los de correo. [Cuándo usar el proxy](https://developers.cloudflare.com/dns/proxy-status/use-cases/)
4. Conectar el subdominio de medios al bucket desde R2; este hostname apunta a R2, no a Railway.
5. Probar HTTPS, carga de tienda y API, medios, checkout y webhook de Stripe. Revisar WAF y Bot Fight Mode como controles distintos; no asumir que activar el proxy habilita cada control.

**Nota de TLS para Railway:** su guía de integración con Cloudflare actualmente indica el modo **Full** para dominios proxied y advierte contra **Full (Strict)** para esa configuración. Cloudflare recomienda Full (Strict) cuando el certificado del origen cumple sus requisitos. Como la indicación depende del origen Railway, comprobar la guía vigente y probarla en *staging* antes de aplicarla en producción. [Configuración Cloudflare de Railway](https://docs.railway.com/networking/domains/working-with-domains), [modos TLS de Cloudflare](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

### 5. Preparar producción

- Crear o habilitar el bucket de producción y credenciales propias de ese entorno.
- Usar hostnames distintos para tienda, API y medios. La ruta de salud y el webhook son rutas dentro del hostname de API, no servicios DNS separados.
- Conectar el hostname de medios al bucket de producción y los hostnames de tienda/API a sus servicios Railway.
- Mantener PostgreSQL y el worker sin hostname público; sólo exponer los servicios que reciben tráfico externo.
- Validar las rutas y el webhook de Stripe en *staging* antes de apuntar el dominio de producción.

## Decisiones que se tomarán más adelante

No hace falta decidir ahora el dominio final, los nombres de buckets, el proceso de carga administrativa, la política de caché ni las reglas específicas de WAF. Se fijarán en la fase correspondiente, probando primero el recorrido equivalente en *staging*.
