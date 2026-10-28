CREATE TABLE "account_cart_items" (
    "account_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "account_cart_items_pkey" PRIMARY KEY ("account_id", "product_id"),
    CONSTRAINT "account_cart_items_quantity_range" CHECK ("quantity" BETWEEN 1 AND 99),
    CONSTRAINT "account_cart_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "account_cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "account_cart_items_account_id_created_at_idx" ON "account_cart_items"("account_id", "created_at");
