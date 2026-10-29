/*
  Warnings:

  - The `version` column on the `account_cart_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cart_item_version` column on the `order_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "account_cart_items" DROP COLUMN "version",
ADD COLUMN     "version" UUID NOT NULL DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "cart_item_version",
ADD COLUMN     "cart_item_version" UUID NOT NULL DEFAULT gen_random_uuid();
