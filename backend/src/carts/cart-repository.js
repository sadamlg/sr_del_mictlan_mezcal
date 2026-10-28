export function createCartRepository(database) {
  return {
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
      return database.accountCartItem.upsert({
        where: { accountId_productId: { accountId, productId } },
        create: { accountId, productId, quantity },
        update: { quantity },
      });
    },

    async removeAccountCartItem(accountId, slug) {
      const product = await database.product.findUnique({ where: { slug }, select: { id: true } });
      if (!product) return;
      await database.accountCartItem.deleteMany({ where: { accountId, productId: product.id } });
    },
  };
}
