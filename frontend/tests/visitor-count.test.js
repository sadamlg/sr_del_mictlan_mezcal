const assert = require('node:assert/strict');
const test = require('node:test');

test('reuses one session identifier across reloads and displays the API count', async () => {
  const { registerBrowserVisit } = await import('../src/lib/visitor-count.js');
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const bodies = [];
  const fetcher = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ count: 27 }) };
  };
  let generated = 0;
  const randomUUID = () => {
    generated += 1;
    return '7a941e74-97e6-49c0-bc21-cd0c655fe8cb';
  };

  assert.equal(await registerBrowserVisit({ storage, randomUUID, fetcher }), 27);
  assert.equal(await registerBrowserVisit({ storage, randomUUID, fetcher }), 27);
  assert.equal(generated, 1);
  assert.deepEqual(bodies, [
    { visitId: '7a941e74-97e6-49c0-bc21-cd0c655fe8cb' },
    { visitId: '7a941e74-97e6-49c0-bc21-cd0c655fe8cb' },
  ]);
});

test('rejects unavailable or malformed counts instead of showing a false number', async () => {
  const { registerBrowserVisit } = await import('../src/lib/visitor-count.js');
  const dependencies = {
    storage: { getItem: () => '7a941e74-97e6-49c0-bc21-cd0c655fe8cb' },
    randomUUID: () => { throw new Error('unexpected generation'); },
  };

  await assert.rejects(
    registerBrowserVisit({ ...dependencies, fetcher: async () => ({ ok: false }) }),
  );
  await assert.rejects(
    registerBrowserVisit({ ...dependencies, fetcher: async () => ({ ok: true, json: async () => ({ count: -1 }) }) }),
  );
});
