import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduler diagnostic: saves only authentication flags in an admin-only table.
// Never return or store headers, tokens, email addresses or user details.
// Elevated credentials being present is NOT an authorization decision.
Deno.serve(async (req) => {
  const result = {
    authenticated: false,
    owner_admin: false,
    auth_result: 'unavailable',
  };
  try {
    const base44 = createClientFromRequest(req);
    try {
      const user = await base44.auth.me();
      result.authenticated = !!user;
      result.owner_admin = user?.id === '69faa8a3ff7324c96aef6557' && user?.role === 'admin';
      result.auth_result = user ? 'authenticated' : 'no_user';
    } catch (error) {
      const status = error?.response?.status ?? error?.status;
      result.auth_result = status === 401 || status === 403 ? 'unauthenticated' : 'auth_error';
    }
  } catch {
    result.auth_result = 'client_error';
  }
  if (!result.authenticated) {
    return Response.json(result, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!result.owner_admin) {
    return Response.json(result, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.MaintenanceDiagnostic.create({
      checked_at: new Date().toISOString(),
      ...result,
    });
  } catch {
    return Response.json({ ...result, saved: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  console.info('maintenanceAccessCheck', JSON.stringify(result));
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
});
