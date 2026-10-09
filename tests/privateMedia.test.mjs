import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
let source = await readFile('base44/functions/private-chat-media/entry.ts', 'utf8');
source = source.replace(/^import .*createClientFromRequest.*;\n/, 'const createClientFromRequest = () => globalThis.mediaTestClient;\n').replace('Deno.serve((req) => handleRequest(req));', '');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const { handleRequest } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const message = { id: 'm1', sender_email: 'alice', receiver_email: 'bob', media_uri: 'private-secret', media_type: 'image' };
async function access(email, blocked = false, record = message) {
  let signed = 0;
  const client = {
    auth: { me: async () => email ? { email } : null },
    asServiceRole: {
      entities: {
        ChatMessage: { filter: async () => record ? [record] : [] },
        BlockedUser: { filter: async () => blocked ? [{}] : [] },
        ScentProfile: { filter: async () => [{}] },
      },
      integrations: { Core: { CreateFileSignedUrl: async params => {
        signed++;
        assert.equal(params.file_uri, 'private-secret');
        assert.equal(params.expires_in, 300);
        return { signed_url: 'https://test.invalid/temporary' };
      } } },
    },
  };
  const req = new Request('https://test.invalid', { method: 'POST', body: JSON.stringify({ message_id: 'm1', file_uri: 'attacker-chosen' }) });
  const response = await handleRequest(req, () => client);
  return { status: response.status, body: await response.json(), signed, cache: response.headers.get('cache-control') };
}
test('only participants receive short-lived media links', async () => {
  for (const email of ['alice', 'bob']) {
    const result = await access(email);
    assert.equal(result.status, 200);
    assert.equal(result.signed, 1);
    assert.equal(result.cache, 'no-store');
    assert.ok(!JSON.stringify(result.body).includes('private-secret'));
  }
});
test('signed out, unrelated, blocked, missing and legacy access never signs a link', async () => {
  for (const args of [[null], ['carol'], ['alice', true], ['alice', false, null], ['alice', false, { ...message, media_uri: null, media_url: 'https://old.invalid' }]]) {
    const result = await access(...args);
    assert.ok([401,403,409].includes(result.status));
    assert.equal(result.signed, 0);
    assert.ok(!JSON.stringify(result.body).includes('old.invalid'));
  }
});
