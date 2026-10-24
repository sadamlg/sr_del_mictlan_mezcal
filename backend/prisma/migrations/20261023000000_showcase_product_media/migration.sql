ALTER TABLE "products"
  ADD COLUMN "lifestyle_image_key" VARCHAR(512),
  ADD COLUMN "label_one" VARCHAR(80),
  ADD COLUMN "label_two" VARCHAR(80);

ALTER TABLE "products" DROP CONSTRAINT "products_active_complete";
ALTER TABLE "products" ADD CONSTRAINT "products_active_complete" CHECK (
  NOT "active" OR (
    "name" IS NOT NULL AND length(trim("name")) > 0 AND
    "description" IS NOT NULL AND length(trim("description")) > 0 AND
    "price_cents" IS NOT NULL AND "price_cents" > 0 AND
    "image_key" IS NOT NULL AND "image_key" ~ '^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)*$' AND
    "image_alt" IS NOT NULL AND length(trim("image_alt")) > 0 AND
    "lifestyle_image_key" IS NOT NULL AND "lifestyle_image_key" ~ '^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)*$' AND
    "label_one" IS NOT NULL AND length(trim("label_one")) > 0 AND
    "label_two" IS NOT NULL AND length(trim("label_two")) > 0
  )
);
