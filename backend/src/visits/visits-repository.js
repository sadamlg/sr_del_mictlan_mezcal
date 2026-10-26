export function createVisitsRepository(prisma) {
  return {
    countVisits() {
      return prisma.siteVisit.count();
    },
    async registerVisit(id) {
      await prisma.siteVisit.createMany({ data: [{ id }], skipDuplicates: true });
      return prisma.siteVisit.count();
    },
  };
}
