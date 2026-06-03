// Service Worker deshabilitado temporalmente
// Limpia el cache antiguo
if ('caches' in self) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name)
    })
  })
}

self.skipWaiting()
