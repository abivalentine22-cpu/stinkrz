// Serialize setup and sign-out so a late setup cannot restore a revoked device.
export function createPushDeviceManager({ revoke, acquire, supported }) {
  let queue = Promise.resolve();
  let signingOut = false;
  let active = null;
  let initialized = false;
  let logoutPromise = null;
  const enqueue = work => {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  };
  async function removeRegistration(client) {
    if (!active) return;
    const { email, token } = active;
    // Delete only this browser's token, preserving the user's other devices.
    for (;;) {
      const rows = await client.entities.PushToken.filter({ user_email: email, token }, undefined, 100);
      if (!rows.length) break;
      await Promise.all(rows.map(row => client.entities.PushToken.delete(row.id)));
    }
    active = null;
  }
  return {
    register(client, email, cancelled = () => false) {
      if (signingOut) return Promise.resolve();
      return enqueue(async () => {
        if (signingOut || cancelled() || !supported()) return;
        // Rotate on the first setup after a reload, too: legacy tokens may be
        // associated with another account that used this shared browser.
        if (!initialized || (active && active.email !== email)) {
          await revoke();
          await removeRegistration(client);
          initialized = true;
        }
        if (signingOut || cancelled()) return;
        const token = await acquire();
        if (!token) return;
        active = { email, token };
        if (signingOut || cancelled()) return;
        const existing = await client.entities.PushToken.filter({ user_email: email, token }, undefined, 1);
        if (signingOut || cancelled()) return;
        if (!existing.length) await client.entities.PushToken.create({ user_email: email, token, device_info: navigator.userAgent.slice(0, 160) });
      });
    },
    logout(client, finishLogout) {
      if (logoutPromise) return logoutPromise;
      signingOut = true;
      logoutPromise = enqueue(async () => {
        // Try both independently. A failed DB request must not skip provider
        // revocation, and a provider outage must not skip DB removal.
        const results = await Promise.allSettled([revoke(), removeRegistration(client)]);
        if (results.some(result => result.status === 'rejected')) console.warn('Some push cleanup failed during sign-out.');
        return finishLogout();
      });
      return logoutPromise;
    },
  };
}
