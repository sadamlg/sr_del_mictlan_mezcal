# Contrato de landing, catálogo y visitas · fase 03

## Alcance

La landing muestra únicamente productos activos. El catálogo no incluye categorías, páginas de detalle, inventario, administración ni carga de archivos. Los productos y sus referencias de medios se mantienen manualmente en PostgreSQL.

La página `/` es pública y muestra la landing, el catálogo y el contador de visitas.

## API

`GET /api/catalog/products` devuelve `200` con `{ "products": [] }` cuando no hay productos activos. Cuando hay productos, cada registro incluye:

```json
{
  "slug": "identificador-estable",
  "name": "Nombre aprobado",
  "description": "Descripción aprobada",
  "price": { "amount": 12345, "currency": "MXN" },
  "image": {
    "url": "https://media.example.test/catalogo/identificador/frente.webp",
    "alt": "Texto alternativo aprobado"
  },
  "lifestyleImage": { "url": "https://media.example.test/catalogo/identificador/ambiente.webp", "alt": "" },
  "labels": ["Materia prima", "Notas de sabor"],
  "sensoryProfile": "Aromas herbales y ahumados.",
  "alcohol": { "minPercent": 40, "maxPercent": 40 },
  "volumeMl": 750
}
```

`price.amount` es un entero en centavos de MXN. `sensoryProfile`, `alcohol` y `volumeMl` pueden ser `null` si esos datos no están documentados; las cifras del ejemplo sólo ilustran la estructura y no representan una ficha comercial. Cuando `alcohol` tiene valor, sus porcentajes describen un valor exacto o un rango mediante `minPercent` y `maxPercent`. La API ordena por `position` y luego `slug`. Si PostgreSQL no está disponible o una ficha activa incumple el contrato, responde `503` con `CATALOG_UNAVAILABLE` y no expone detalles internos.

## Datos y publicación

La tabla `products` conserva un `slug`, nombre, descripción, precio en centavos, claves de ambas imágenes, texto alternativo de la botella, dos etiquetas descriptivas, perfil sensorial, porcentajes mínimo y máximo de alcohol, volumen en mililitros, posición y estado activo. Los campos opcionales de información sensorial, alcohol y volumen pueden quedar sin documentar y se publican como `null`. Los campos requeridos pueden permanecer vacíos mientras la ficha está inactiva; PostgreSQL impide activar un producto incompleto. La imagen de ambiente es decorativa, por lo que su texto alternativo público está vacío.

`backend/prisma/dev-showcase.sql` carga tres fichas de demostración para desarrollo o staging aislado. Sus precios de $250, $350 y $500 MXN por 750 ml son provisionales; no incluyen todos los costos ni constituyen precios comerciales aprobados. El archivo no es una migración ni se ejecuta automáticamente. Puede usarse después de las migraciones en una base no productiva; nunca en producción. El carrito y el checkout pueden cobrar estas fichas en modo de prueba, así que define precios de venta reales antes de habilitar pagos públicos.

## Medios

PostgreSQL conserva una clave relativa y estable, por ejemplo `catalogo/identificador/frente.webp`; no conserva una URL temporal. La aplicación la resuelve con `MEDIA_BASE_URL`. En desarrollo local, Compose apunta al origen del frontend; para revisar desde otro dispositivo de la LAN, puede usar la IP privada del equipo anfitrión por HTTP. Esa excepción sólo está habilitada en desarrollo; para staging, usar HTTPS con el origen público no productivo configurado para medios. No se requieren credenciales de escritura en la aplicación porque la carga del MVP es manual.

Las claves aceptan segmentos ASCII de letras, números, puntos, guiones y guiones bajos, sin segmentos `.` o `..`, barra inicial, query o fragmento. `MEDIA_BASE_URL` requiere HTTPS; localhost y una IPv4 privada por HTTP solo se permiten en desarrollo. Frontend y backend aplican el mismo contrato. La URL no puede contener credenciales, query ni fragmento.

## Contador de visitas

El contador muestra cuántas sesiones del navegador han abierto la landing desde que se habilitó esta tabla. No representa personas únicas ni visitas históricas anteriores a la migración.

Al cargar la página, el navegador genera un UUID y lo guarda en `sessionStorage`. Envía `POST /api/visits` a la ruta del frontend; esta lo reenvía a la API interna. Una recarga reutiliza el UUID y no incrementa la cifra. Al abrir otra pestaña o sesión puede generarse otro UUID. No se guardan IP, cookies ni información personal para este contador.

La API expone `GET /api/visits` para leer `{ "count": 123 }` y `POST /api/visits` con `{ "visitId": "UUID v4" }` para registrar la sesión y devolver el conteo actualizado. Ambos responden con `Cache-Control: no-store`. El POST limita el cuerpo a 256 bytes: uno inválido responde 400 (`INVALID_VISIT_ID`) y uno mayor responde 413 (`REQUEST_TOO_LARGE`). Una falla de almacenamiento responde 503 (`VISITS_UNAVAILABLE`). La base de datos impone unicidad sobre `visitId`, de modo que los reintentos son idempotentes.

La cifra se conserva en un registro agregado que se inicializa desde las visitas existentes y se actualiza en la base de datos cuando se inserta una sesión nueva. Leer el contador no recorre la tabla de visitas.

El frontend muestra un guion mientras carga o si el servicio falla; nunca presenta una cifra inventada. Este contador público es orientativo: un cliente puede generar UUID nuevos y sumar visitas. No debe utilizarse como métrica antifraude ni como analítica de usuarios únicos.
