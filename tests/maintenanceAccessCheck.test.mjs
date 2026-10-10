import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

let source = await readFile('base44/functions/maintenanceAccessCheck/entry.ts', 'utf8');
source = source.replace(/^import .*createClientFromRequest.*;\n/, 'const createClientFromRequest = () => globalThis.maintenanceTestClient;\n');
source = source.replace('Deno.serve(async (req) => {', 'export const handler = async (req) => {').replace(/\}\);\s*$/, '};');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const { handler } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

test('scheduler probe requires both owner identity and admin role; exposes no personal data', async () => {
  for (const [user, expected] of [
    [null, false],
    [{ id: 'other', role: 'admin', email: 'private@example.com' }, false],
    [{ id: '69faa8a3ff7324c96aef6557', role: 'user' }, false],
    [{ id: '69faa8a3ff7324c96aef6557', role: 'admin' }, true],
  ]) {
    let writes = 0;
    globalThis.maintenanceTestClient = {
      auth: { me: async () => user },
      asServiceRole: { entities: { MaintenanceDiagnostic: { create: async (record) => { writes++; assert.equal(record.owner_admin, expected); assert.ok(record.checked_at); } } } },
    };
    const response = await handler(new Request('https://example.com'));
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const body = await response.json();
    assert.equal(response.status, expected ? 200 : user ? 403 : 401);
    assert.equal(writes, expected ? 1 : 0);
    assert.equal(body.owner_admin, expected);
    assert.deepEqual(Object.keys(body).sort(), ['auth_result', 'authenticated', 'owner_admin']);
  }
});

test('auth failures remain distinguishable from missing user identity', async () => {
  for (const [status, expected] of [[401, 'unauthenticated'], [403, 'unauthenticated'], [500, 'auth_error']]) {
    globalThis.maintenanceTestClient = {
      auth: { me: async () => { throw Object.assign(new Error('SECRET'), { response: { status } }); } },
      asServiceRole: { entities: { MaintenanceDiagnostic: { create: async () => { assert.fail('Unauthorized diagnostic write'); } } } },
    };
    const body = await (await handler(new Request('https://example.com'))).json();
    assert.equal(body.auth_result, expected);
    assert.equal(body.owner_admin, false);
    assert.equal(JSON.stringify(body).includes('SECRET'), false);
  }
});
