import assert from 'node:assert/strict';
import test from 'node:test';
import { readSessionCookie } from './session-cookie.js';

test('session cookie parser reads only the named cookie and ignores unrelated values', () => {
  assert.equal(readSessionCookie({ headers: { cookie: 'theme=dark; mictlan_session=opaque-token; locale=es' } }), 'opaque-token');
  assert.equal(readSessionCookie({ headers: { cookie: 'mictlan_session_extra=wrong' } }), undefined);
  assert.equal(readSessionCookie({ headers: {} }), undefined);
});
