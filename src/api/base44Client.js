import { createClient } from '@base44/sdk';
import { secureClient } from './secureClient';
import { pushDevice } from '@/lib/pushDevice';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const client = secureClient(createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
}));

// Protect every sign-out entry point, including direct SDK-style callers.
const auth = new Proxy(client.auth, {
  get(target, key) {
    if (key === 'logout') return (...args) => pushDevice.logout(client, () => target.logout(...args));
    return target[key];
  },
});
export const base44 = new Proxy(client, { get(target, key) { return key === 'auth' ? auth : target[key]; } });
