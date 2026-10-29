-- AlterTable
ALTER TABLE "account_cart_items" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "cart_item_updated_at" SET DATA TYPE TIMESTAMPTZ(3);
