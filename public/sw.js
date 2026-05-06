// Stinkrz Service Worker — handles push notifications

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'scent-match',
      renotify: true,
      data: { url: url || '/scent-block' },
    });
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Stinkrz', {
      body: data.body || 'Someone nearby matches your scent vibe!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'scent-match',
      renotify: true,
      data: { url: data.url || '/scent-block' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/scent-block';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
