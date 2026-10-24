-- Vista previa local únicamente. Los importes son bases provisionales, no precios de venta aprobados.
-- Ejecutar sólo en la base de datos de desarrollo después de prisma migrate deploy.
INSERT INTO products (
  id, slug, name, description, price_cents, image_key, image_alt,
  lifestyle_image_key, label_one, label_two, position, active, updated_at
) VALUES
  (
    gen_random_uuid(), 'calios', 'Calios · Destilado de pulque',
    'Un destilado de pulque de perfil frutal y terroso.', 25000,
    'images/catalog/calios-product.png', 'Botella de Calios, destilado de pulque',
    'images/catalog/calios-lifestyle.png', 'Pulque fermentado', 'Frutal y terroso', 1, true, now()
  ),
  (
    gen_random_uuid(), 'mezcal-joven', 'Mezcal joven · Una destilación',
    'Elaborado con cupreata silvestre, de notas herbales y ahumadas.', 35000,
    'images/catalog/mezcal-joven-product.png', 'Botella de mezcal joven Señor del Mictlán',
    'images/catalog/mezcal-joven-lifestyle.png', 'Cupreata silvestre', 'Herbal y ahumado', 2, true, now()
  ),
  (
    gen_random_uuid(), 'mezcal-doble-destilacion', 'Mezcal · Doble destilación',
    'Elaborado con cupreata silvestre, con notas de quiote y madera.', 50000,
    'images/catalog/mezcal-reposado-product.png', 'Botella de mezcal de doble destilación Señor del Mictlán',
    'images/catalog/mezcal-reposado-lifestyle.png', 'Cupreata silvestre', 'Quiote y madera', 3, true, now()
  )
ON CONFLICT (slug) DO NOTHING;
