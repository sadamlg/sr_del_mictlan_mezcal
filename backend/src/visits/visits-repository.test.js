import assert from 'node:assert/strict';
import test from 'node:test';
import { createVisitsRepository } from './visits-repository.js';

test('retries of one session do not increase the persisted count', async () => {
  const ids = new Set();
  const prisma = {
    siteVisit: {
      async createMany({ data, skipDuplicates }) {
        assert.equal(skipDuplicates, true);
        for (const visit of data) ids.add(visit.id);
      },
      async count() {
        return ids.size;
      },
    },
  };
  const repository = createVisitsRepository(prisma);
  const first = '7a941e74-97e6-49c0-bc21-cd0c655fe8cb';
  const second = '611bb1e3-f750-4956-9f66-2de8458bc837';

  assert.equal(await repository.registerVisit(first), 1);
  assert.equal(await repository.registerVisit(first), 1);
  assert.equal(await repository.registerVisit(second), 2);
  assert.equal(await repository.countVisits(), 2);
});
