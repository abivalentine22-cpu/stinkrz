import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Read-only scheduler diagnostic. Never return headers, tokens or user details.
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
  console.info('maintenanceAccessCheck', JSON.stringify(result));
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
});
