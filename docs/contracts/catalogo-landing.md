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
  "labels": ["Materia prima", "Notas de sabor"]
}
```

`price.amount` es un entero en centavos de MXN. La API ordena por `position` y luego `slug`. Si PostgreSQL no está disponible o una ficha activa incumple el contrato, responde `503` con `CATALOG_UNAVAILABLE` y no expone detalles internos.

## Datos y publicación

La tabla `products` conserva un `slug`, nombre, descripción, precio en centavos, claves de ambas imágenes, texto alternativo de la botella, dos etiquetas descriptivas, posición y estado activo. Los campos de publicación pueden permanecer vacíos mientras la ficha está inactiva. PostgreSQL impide activar un producto incompleto. La imagen de ambiente es decorativa, por lo que su texto alternativo público está vacío.

`backend/prisma/dev-showcase.sql` carga tres fichas únicamente para la vista previa local. Sus $250, $350 y $500 MXN por 750 ml son bases provisionales proporcionadas por el proyecto; faltan envase, etiquetas, impuestos, comisiones y otros costos. El cliente definirá precios de venta en una sesión futura. Este archivo no se ejecuta como migración ni se aplica en staging o producción. El botón de compra permanece deshabilitado hasta implementar el carrito y aprobar precios de venta.

## Medios

PostgreSQL conserva una clave relativa y estable, por ejemplo `catalogo/identificador/frente.webp`; no conserva una URL temporal. La aplicación la resuelve con `MEDIA_BASE_URL`. En local, Compose apunta al origen del frontend; para staging, usar el origen público no productivo configurado para medios. No se requieren credenciales de escritura en la aplicación porque la carga del MVP es manual.

Las claves aceptan segmentos ASCII de letras, números, puntos, guiones y guiones bajos, sin segmentos `.` o `..`, barra inicial, query o fragmento. `MEDIA_BASE_URL` requiere HTTPS, salvo localhost en desarrollo, y no puede contener credenciales, query ni fragmento.
