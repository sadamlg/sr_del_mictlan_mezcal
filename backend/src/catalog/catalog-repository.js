export function createCatalogRepository(prisma) {
  return {
    findActiveProducts() {
      return prisma.product.findMany({
        where: { active: true },
        select: {
          slug: true,
          name: true,
          description: true,
          priceCents: true,
          imageKey: true,
          imageAlt: true,
        },
        orderBy: [{ position: 'asc' }, { slug: 'asc' }],
      });
    },
  };
}
