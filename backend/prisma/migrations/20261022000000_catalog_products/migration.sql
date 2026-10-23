CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120),
    "description" TEXT,
    "price_cents" INTEGER,
    "image_key" VARCHAR(512),
    "image_alt" VARCHAR(240),
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT "products_price_positive" CHECK ("price_cents" IS NULL OR "price_cents" > 0),
    CONSTRAINT "products_active_complete" CHECK (
        NOT "active" OR (
            "name" IS NOT NULL AND length(trim("name")) > 0 AND
            "description" IS NOT NULL AND length(trim("description")) > 0 AND
            "price_cents" IS NOT NULL AND "price_cents" > 0 AND
            "image_key" IS NOT NULL AND "image_key" ~ '^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)*$' AND
            "image_alt" IS NOT NULL AND length(trim("image_alt")) > 0
        )
    )
);

CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_active_position_slug_idx" ON "products"("active", "position", "slug");
