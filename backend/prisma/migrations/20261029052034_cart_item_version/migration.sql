-- AlterTable
ALTER TABLE "account_cart_items" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "cart_item_version" INTEGER NOT NULL DEFAULT 1;
