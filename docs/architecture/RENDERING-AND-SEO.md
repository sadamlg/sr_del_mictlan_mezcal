# Renderizado y SEO

## Decisión

Se conserva Next.js App Router para servir la landing y el catálogo con HTML generado en el servidor, y para usar Server Components en los datos públicos y Client Components sólo donde hacen falta interacciones del navegador. React con Express también puede implementar SSR, pero requeriría construir y mantener por separado el enrutado, el renderizado y la hidratación que Next.js ya integra.

SSR ayuda a que el HTML inicial incluya el contenido público antes de ejecutar JavaScript. Esto facilita la indexación y hace que el contenido principal aparezca antes de hidratar las interacciones; no garantiza por sí solo posiciones en buscadores ni hace que cada render sea más rápido. Google puede ejecutar JavaScript, pero el renderizado previo también sirve a crawlers que no lo hacen o que lo procesan con limitaciones ([Google Search Central](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)).

## Estrategia de renderizado

- Next.js mantiene `cacheComponents` activo y el catálogo dentro de un límite `<Suspense>`. La página puede enviar las secciones listas mientras consulta la API privada por la red de Railway.
- Los datos públicos del catálogo se cachean en el servidor con el perfil `days`: la revalidación se activa después de un día y la entrada expira tras una semana sin uso. La primera visita después de cumplido el día puede recibir el dato anterior mientras Next.js actualiza la caché. Los fallos de configuración, red o contrato usan el perfil breve `seconds`, para que una respuesta de error no oculte una recuperación del backend.
- Si el catálogo cambia, la tienda puede seguir mostrando el resultado cacheado hasta su siguiente revalidación. Checkout siempre consulta al backend el estado y el precio vigentes; la caché del catálogo no autoriza ni fija un cobro.
- Los formularios, carrito y aviso de edad conservan sus componentes de cliente donde necesitan estado o APIs del navegador. Los datos de cuenta y checkout no se agregan a la caché pública.

`cacheComponents`, `use cache` y `cacheLife` son las APIs de Next.js 16 para este modelo de caché y renderizado parcial ([Cache Components](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents), [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache), [`cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)).

## Alcance SEO del MVP

La superficie indexable del MVP es la landing con su escaparate. El alcance aprobado no incluye páginas independientes para cada producto ni para categorías, así que no se crean URLs SEO por producto hasta que esa capacidad se agregue al alcance.

El layout ya define título, descripción y `lang="es"`. Antes del dominio público definitivo, completar la configuración de descubrimiento y vistas previas con la URL canónica, `metadataBase`, Open Graph y Twitter Cards, `robots.txt` y `sitemap.xml`. Las rutas de cuenta, checkout y demás páginas no públicas deben excluirse de indexación al definir sus metadatos. Next.js expone estas piezas a través de su Metadata API ([Metadata y Open Graph](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)).

SEO no depende únicamente de SSR: también requiere contenido útil, metadatos correctos, enlaces rastreables, buen rendimiento y la configuración del dominio. Mantener los productos en HTML inicial no sustituye esas tareas.
