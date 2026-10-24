# Medios del showcase para R2

**Estado:** pendiente por decisión del proyecto; todavía no existe una cuenta de Cloudflare. La vista previa local funciona con los archivos de `frontend/public`.

La implementación local usa exactamente las mismas claves relativas que se cargarán en el bucket R2 de desarrollo/staging. El origen público se define por entorno con `MEDIA_BASE_URL` en backend y frontend; las fichas en PostgreSQL conservan únicamente las claves. No se guardan URLs de `r2.dev` en la base.

| Clave en R2 | Archivo local | Uso |
| --- | --- | --- |
| `images/mezcal-showcase-background.png` | `frontend/public/images/mezcal-showcase-background.png` | Fondo de escritorio |
| `images/mezcal-showcase-background-mobile.png` | `frontend/public/images/mezcal-showcase-background-mobile.png` | Fondo móvil |
| `images/catalog/calios-product.png` | `frontend/public/images/catalog/calios-product.png` | Botella Calios |
| `images/catalog/calios-lifestyle.png` | `frontend/public/images/catalog/calios-lifestyle.png` | Ambiente Calios |
| `images/catalog/mezcal-joven-product.png` | `frontend/public/images/catalog/mezcal-joven-product.png` | Botella joven |
| `images/catalog/mezcal-joven-lifestyle.png` | `frontend/public/images/catalog/mezcal-joven-lifestyle.png` | Ambiente joven |
| `images/catalog/mezcal-reposado-product.png` | `frontend/public/images/catalog/mezcal-reposado-product.png` | Botella doble destilación |
| `images/catalog/mezcal-reposado-lifestyle.png` | `frontend/public/images/catalog/mezcal-reposado-lifestyle.png` | Ambiente doble destilación |

## Activación en staging

1. La persona responsable del proyecto inicia sesión en Cloudflare, activa R2 y crea un bucket exclusivo de desarrollo/staging conforme a [la guía de R2](r2.md). Estas ocho imágenes están destinadas a visitantes y pueden publicarse en ese entorno.
2. Carga manualmente los ocho archivos con las claves exactas de la tabla. Conserva los nombres y las carpetas; así no hay que reescribir registros en PostgreSQL.
3. Habilita el acceso público de staging y copia su origen real de `r2.dev`. Configura ese origen, sin barra final, como `MEDIA_BASE_URL` en frontend y backend de staging. No agregues credenciales de escritura a la aplicación.
4. Comprueba las ocho respuestas HTTP, ambas variantes del fondo y las tres parejas de imágenes en navegador. El botón de compra continúa deshabilitado hasta tener carrito y precios de venta aprobados.

La base local usa `http://localhost:3000` y sirve los archivos desde `frontend/public`. El seed `backend/prisma/dev-showcase.sql` sólo se usa en desarrollo; staging y producción requieren una decisión posterior sobre datos y precios de venta.
