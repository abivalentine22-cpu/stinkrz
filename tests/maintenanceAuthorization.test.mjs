import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const names = ["markOfflineUsers","cleanupOldNotifications","cleanupOldProfileViews","deleteExpiredPosts","cleanupTypingIndicators","notifyExpiringPosts","sendMissedMessageEmail"];
for (const name of names) {
  let source = await readFile(`base44/functions/${name}/entry.ts`, 'utf8');
  source = source.replace(/^import .*createClientFromRequest.*;\n/, 'const createClientFromRequest = () => globalThis.maintenanceGuardClient;\n');
  source = source.replace('Deno.serve(async (req) => {', 'export const handler = async (req) => {').replace(/\}\);\s*$/, '};');
  const { code } = await transform(source, { loader: 'ts', format: 'esm' });
  const { handler } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  test(`${name}: rejects unauthorized callers before any service access`, async () => {
    for (const [user, status] of [
      [null, 401],
      [{ id: 'ordinary', role: 'user' }, 403],
      [{ id: 'other-admin', role: 'admin' }, 403],
      [{ id: '69faa8a3ff7324c96aef6557', role: 'user' }, 403],
      [new Error('private auth failure'), 401],
    ]) {
      let serviceReads = 0;
      globalThis.maintenanceGuardClient = {
        auth: { me: async () => { if (user instanceof Error) throw user; return user; } },
        get asServiceRole() { serviceReads++; throw new Error('must not access'); },
      };
      const response = await handler(new Request('https://example.com'));
      assert.equal(response.status, status);
      assert.equal(serviceReads, 0);
      assert.equal(JSON.stringify(await response.json()).includes('private'), false);
    }
  });
  test(`${name}: permits the owner/admin and completes with empty mocked data`, async () => {
    let serviceReads = 0;
    const entity = { list: async () => [], deleteMany: async () => ({ deleted_count: 0 }) };
    globalThis.maintenanceGuardClient = {
      auth: { me: async () => ({ id: '69faa8a3ff7324c96aef6557', role: 'admin' }) },
      get asServiceRole() {
        serviceReads++;
        return { entities: new Proxy({}, { get: () => entity }) };
      },
    };
    const response = await handler(new Request('https://example.com'));
    assert.equal(response.status, 200);
    assert.ok(serviceReads > 0);
  });
}
