import assert from 'node:assert/strict';
import test from 'node:test';
import { createVisitsHandlers } from './visits-handler.js';

const visitId = '7a941e74-97e6-49c0-bc21-cd0c655fe8cb';

function createResponse() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('GET exposes the persisted visit count without caching it', async () => {
  const handlers = createVisitsHandlers({
    countVisits: async () => 14,
    registerVisit: async () => 15,
  });
  const response = createResponse();

  await handlers.get({}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { count: 14 });
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('POST registers a valid browser session and returns the count', async () => {
  let receivedId;
  const handlers = createVisitsHandlers({
    countVisits: async () => 14,
    registerVisit: async (id) => {
      receivedId = id;
      return 15;
    },
  });
  const response = createResponse();

  await handlers.post({ body: { visitId } }, response);

  assert.equal(receivedId, visitId);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { count: 15 });
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('POST rejects malformed and unexpected visit payloads before writing', async () => {
  let writes = 0;
  const handlers = createVisitsHandlers({
    countVisits: async () => 0,
    registerVisit: async () => { writes += 1; return 1; },
  });

  for (const body of [undefined, {}, { visitId: 'not-a-uuid' }, { visitId, extra: true }]) {
    const response = createResponse();
    await handlers.post({ body }, response);
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error.code, 'INVALID_VISIT_ID');
  }
  assert.equal(writes, 0);
});

test('database failures return a generic unavailable error', async () => {
  const handlers = createVisitsHandlers({
    countVisits: async () => { throw new Error('database password leaked'); },
    registerVisit: async () => { throw new Error('database password leaked'); },
  });

  for (const [handler, request] of [[handlers.get, {}], [handlers.post, { body: { visitId } }]]) {
    const response = createResponse();
    await handler(request, response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.error.code, 'VISITS_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(response.body), /password/);
  }
});
