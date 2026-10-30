# Medios locales y Cloudflare R2

Las fichas guardan claves relativas estables como `images/catalog/calios-product.png`. Frontend y API forman las URLs con `MEDIA_BASE_URL`; el navegador descarga los archivos desde ese origen. La carga de imágenes del MVP es manual y la aplicación no necesita credenciales de escritura en R2.

## Elegir el origen

| Entorno | Origen | Configuración |
|---|---|---|
| Desarrollo estándar | `frontend/public/` | `MEDIA_BASE_URL=http://localhost:3000`. |
| Desarrollo en LAN | El mismo `frontend/public/` | `MEDIA_BASE_URL=http://<IP-LAN>:<FRONTEND_PORT>`. |
| Desarrollo con R2 o staging | Bucket público no productivo | `MEDIA_BASE_URL=https://<origen-R2>` en frontend y API. |
| Producción | Bucket y hostname propios | URL HTTPS de producción; no reutilices el bucket de staging. |

Para mostrar imágenes en Stripe Checkout, configura `STRIPE_MEDIA_BASE_URL` en la API con un origen HTTPS público que contenga las mismas claves. Stripe no puede acceder a `localhost` ni a una IP privada. Si queda vacío, el pago funciona sin imágenes en Checkout. `MEDIA_BASE_URL` del frontend participa en la construcción de Next.js: al cambiarlo en Railway, reconstruye el frontend.

## Preparar R2 desde cero

1. En Cloudflare R2, crea un bucket no productivo. Los buckets son privados hasta que habilites una forma de acceso público.
2. Para desarrollo o staging, habilita **Public Development URL** en los ajustes del bucket y copia su origen `https://…r2.dev`. Cloudflare reserva esa URL para uso no productivo.
3. Sube manualmente los archivos de `frontend/public/` respetando las claves de la tabla siguiente. En el panel de R2, entra en cada carpeta correspondiente antes de subir o usa una herramienta que conserve las rutas.
4. Abre en el navegador al menos la URL de marca, una de catálogo y una de fondo. Comprueba que no devuelvan 404 y que `MEDIA_BASE_URL` no tenga barra final, query ni credenciales.
5. Configura las variables en el entorno elegido y recrea los contenedores o reconstruye el frontend desplegado. Verifica la marca, la colección, carrito y resumen de compra. Si quieres imágenes en Stripe, comprueba también su vista alojada.

[Crear bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/), [habilitar acceso público](https://developers.cloudflare.com/r2/buckets/public-buckets/) y [subir objetos](https://developers.cloudflare.com/r2/objects/upload-objects/) están documentados por Cloudflare.

## Inventario del proyecto

El origen público no productivo usado por este proyecto al documentarlo es `https://pub-47df7d3a7dd94d268c1661b2c36e0ae5.r2.dev`. Es un valor de este entorno, no una URL que otra persona deba copiar a su bucket.

| Clave | Uso |
|---|---|
| `images/mezcal-showcase-background.png` | Escaparate en escritorio. |
| `images/mezcal-showcase-background-mobile.png` | Escaparate en móvil. |
| `images/catalog/calios-product.png` | Botella Calios. |
| `images/catalog/calios-lifestyle.png` | Ambiente Calios. |
| `images/catalog/mezcal-joven-product.png` | Botella de mezcal joven. |
| `images/catalog/mezcal-joven-lifestyle.png` | Ambiente de mezcal joven. |
| `images/catalog/mezcal-reposado-product.png` | Botella de mezcal reposado. |
| `images/catalog/mezcal-reposado-lifestyle.png` | Ambiente de mezcal reposado. |
| `images/hero-background.png` | Fondo del hero. |
| `images/brand/senor-del-mictlan-brand.png` | Marca en encabezado y pie. |
| `images/age-gate/skull.png` | Aviso de edad. |
| `images/landing/cupreata-label.png` | Etiqueta en preguntas frecuentes. |

Las variantes `*-product.png` se usan en catálogo, carrito y Checkout; las `*-lifestyle.png` son decorativas. `frontend/src/app/favicon.ico` sigue dentro de Next.js. No subas documentos privados al bucket público.

## Producción y diagnóstico

Prepara otro bucket y un hostname propio para producción. Cloudflare indica que `r2.dev` tiene límites y no está destinado a tráfico productivo; no apuntes un CNAME a ese subdominio para simular un dominio propio. Conecta el dominio mediante la función **Custom Domains** de R2 cuando la zona esté preparada. [Buckets públicos](https://developers.cloudflare.com/r2/buckets/public-buckets/).

Si faltan imágenes, inspecciona la URL real solicitada por el navegador: una clave equivocada produce 404; un origen local desde otro dispositivo puede apuntar a su propio `localhost`; y un cambio de `MEDIA_BASE_URL` en Railway requiere reconstruir el frontend. Las fichas de producto no guardan URLs temporales ni credenciales.
