# Contrato de catálogo público

## Alcance

La landing muestra únicamente productos activos. El catálogo no incluye categorías, páginas de detalle, inventario, administración ni carga de archivos. Los productos y sus referencias de medios se mantienen manualmente en PostgreSQL.

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

`backend/prisma/dev-showcase.sql` carga tres fichas únicamente para una vista previa local. Sus precios de $250, $350 y $500 MXN por 750 ml son provisionales; no incluyen todos los costos y no constituyen precios comerciales aprobados. El archivo no es una migración ni se ejecuta automáticamente. Sólo úsalo en una base local vacía; no lo apliques en staging o producción. El carrito y el checkout ya están implementados, así que estos registros de demostración pueden avanzar al pago: define precios de venta reales antes de habilitar ventas públicas.

## Medios

PostgreSQL conserva una clave relativa y estable, por ejemplo `catalogo/identificador/frente.webp`; no conserva una URL temporal. La aplicación la resuelve con `MEDIA_BASE_URL`. En desarrollo local, Compose apunta al origen del frontend; para revisar desde otro dispositivo de la LAN, puede usar la IP privada del equipo anfitrión por HTTP. Esa excepción sólo está habilitada en desarrollo; para staging, usar HTTPS con el origen público no productivo configurado para medios. No se requieren credenciales de escritura en la aplicación porque la carga del MVP es manual.

Las claves aceptan segmentos ASCII de letras, números, puntos, guiones y guiones bajos, sin segmentos `.` o `..`, barra inicial, query o fragmento. `MEDIA_BASE_URL` requiere HTTPS; localhost y una IPv4 privada por HTTP solo se permiten en desarrollo. Frontend y backend aplican el mismo contrato. La URL no puede contener credenciales, query ni fragmento.
