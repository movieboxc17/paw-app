const CACHE_NAME = 'wayfinder-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/images/app-icon.png',
  '/images/app-icon-192.png',
  '/images/app-icon-512.png',
  '/images/placeholder.jpg',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://unpkg.com/leaflet.locatecontrol/dist/L.Control.Locate.min.css',
  'https://unpkg.com/leaflet.locatecontrol/dist/L.Control.Locate.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a one-time use
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // Store the response in cache
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If this cache name isn't present in the whitelist, delete it
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-saved-places') {
    event.waitUntil(syncSavedPlaces());
  }
});

// Example function to sync saved places with server when online
function syncSavedPlaces() {
  return self.clients.matchAll()
    .then(clients => {
      if (clients && clients.length) {
        // Send message to client to sync data
        clients[0].postMessage({
          type: 'sync-saved-places'
        });
      }
    });
}
