self.addEventListener('push', (event) => {
  let data = { title: 'Dokan', body: '', url: '/', tag: 'notification' }
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) }
  } catch {
    data.body = event.data?.text() ?? ''
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/dokan-icon-192.png',
      badge: '/icons/dokan-icon-192.png',
      tag: data.tag,
      data: { url: data.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const dashboard = clients.find((client) => 'focus' in client)
      if (dashboard) return dashboard.navigate(url).then((client) => client.focus())
      return self.clients.openWindow(url)
    }),
  )
})
