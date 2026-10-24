ALTER TABLE "products"
  ADD COLUMN "sensory_profile" TEXT,
  ADD COLUMN "alcohol_min_percent" DOUBLE PRECISION,
  ADD COLUMN "alcohol_max_percent" DOUBLE PRECISION,
  ADD COLUMN "volume_ml" INTEGER;

ALTER TABLE "products" ADD CONSTRAINT "products_insights_valid" CHECK (
  ("sensory_profile" IS NULL OR length(trim("sensory_profile")) > 0) AND
  (
    ("alcohol_min_percent" IS NULL AND "alcohol_max_percent" IS NULL) OR
    (
      "alcohol_min_percent" IS NOT NULL AND
      "alcohol_max_percent" IS NOT NULL AND
      "alcohol_min_percent" > 0 AND
      "alcohol_max_percent" >= "alcohol_min_percent" AND
      "alcohol_max_percent" <= 100
    )
  ) AND
  ("volume_ml" IS NULL OR "volume_ml" > 0)
);

UPDATE "products" SET
  "sensory_profile" = 'Notas frutales y dulces únicas, con un retrogusto terroso que evoca las antiguas haciendas pulqueras.',
  "alcohol_min_percent" = 36,
  "alcohol_max_percent" = 42,
  "volume_ml" = 750
WHERE "slug" = 'calios';

UPDATE "products" SET
  "sensory_profile" = 'Aromas frescos a hierba y tierra húmeda. Entrada potente en boca con un ahumado auténtico y persistente.',
  "alcohol_min_percent" = 45,
  "alcohol_max_percent" = 45,
  "volume_ml" = 750
WHERE "slug" = 'mezcal-joven';

UPDATE "products" SET
  "sensory_profile" = 'Notas dulces de quiote y madera con un final ahumado elegante. Cuerpo robusto y matices dorados brillantes.',
  "alcohol_min_percent" = 40,
  "alcohol_max_percent" = 40,
  "volume_ml" = 750,
  "name" = CASE WHEN "name" = 'Mezcal · Doble destilación' THEN 'Mezcal reposado · Doble destilación' ELSE "name" END
WHERE "slug" = 'mezcal-doble-destilacion';
