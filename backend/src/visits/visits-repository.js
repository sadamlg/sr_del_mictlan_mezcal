export function createVisitsRepository(prisma) {
  async function readCount() {
    const counter = await prisma.siteVisitCounter.findUnique({
      where: { id: 1 },
      select: { visitCount: true },
    });
    if (!counter) throw new Error('El contador de visitas no está inicializado.');

    const count = Number(counter.visitCount);
    if (!Number.isSafeInteger(count)) throw new Error('El contador de visitas excede el rango seguro.');
    return count;
  }

  return {
    countVisits: readCount,
    async registerVisit(id) {
      await prisma.siteVisit.createMany({ data: [{ id }], skipDuplicates: true });
      return readCount();
    },
  };
}
