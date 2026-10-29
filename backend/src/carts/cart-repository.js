import { randomUUID } from 'node:crypto';
import { CartError } from './cart-service.js';

export function createCartRepository(database) {
  return {
    async mergeGuestCart(accountId, transferId, items) {
      return database.$transaction(async (transaction) => {
        const receipt = await transaction.accountCartMerge.createMany({
          data: [{ accountId, transferId }],
          skipDuplicates: true,
        });
        if (receipt.count === 0) return;

        const products = await transaction.product.findMany({
          where: { slug: { in: items.map(({ slug }) => slug) } },
          select: { id: true, slug: true },
        });
        const bySlug = new Map(products.map((product) => [product.slug, product.id]));
        if (bySlug.size !== items.length) {
          throw new CartError(409, 'PRODUCT_NOT_AVAILABLE', 'Un producto ya no existe. Quítalo del carrito y vuelve a intentar.');
        }

        for (const { slug, quantity } of items) {
          const version = randomUUID();
          await transaction.$executeRaw`
            INSERT INTO "account_cart_items" ("account_id", "product_id", "quantity", "version", "updated_at")
            VALUES (${accountId}::uuid, ${bySlug.get(slug)}::uuid, ${quantity}, ${version}::uuid, NOW())
            ON CONFLICT ("account_id", "product_id") DO UPDATE
            SET "quantity" = LEAST(99, "account_cart_items"."quantity" + EXCLUDED."quantity"),
                "version" = ${version}::uuid,
                "updated_at" = NOW()
          `;
        }
      });
    },

    findAccountCartItems(accountId) {
      return database.accountCartItem.findMany({
        where: { accountId },
        include: { product: true },
        orderBy: [{ createdAt: 'asc' }, { productId: 'asc' }],
      });
    },

    findPurchasableProductBySlug(slug) {
      return database.product.findFirst({
        where: { slug, active: true },
        select: { id: true, slug: true },
      });
    },

    setAccountCartItem({ accountId, productId, quantity }) {
      const version = randomUUID();
      return database.accountCartItem.upsert({
        where: { accountId_productId: { accountId, productId } },
        create: { accountId, productId, quantity, version },
        update: { quantity, version },
      });
    },

    async removeAccountCartItem(accountId, slug) {
      const product = await database.product.findUnique({ where: { slug }, select: { id: true } });
      if (!product) return;
      await database.accountCartItem.deleteMany({ where: { accountId, productId: product.id } });
    },
  };
}
