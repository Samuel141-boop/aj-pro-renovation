/* AJ PRO RÉNOVATION — Service Worker
   Stratégie : cache-first pour le shell, network-first avec fallback cache pour le reste.
   Permet à l'app de fonctionner hors-ligne (utile en chantier sans wifi). */

const CACHE_VERSION = 'aj-pro-v4-2026-04-27-bathwizard';
const SHELL_CACHE = 'aj-pro-shell-' + CACHE_VERSION;
const RUNTIME_CACHE = 'aj-pro-runtime';

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/bathroom-quote.js'
];

/* Install : pré-cache du shell */
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function(cache){
      return cache.addAll(SHELL_FILES).catch(function(err){
        console.warn('[SW] Shell precache partial fail', err);
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

/* Activate : nettoie les anciens caches */
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== SHELL_CACHE && k !== RUNTIME_CACHE){
          return caches.delete(k);
        }
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Fetch : stratégie selon le type de ressource */
self.addEventListener('fetch', function(event){
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Le shell HTML : network-first puis cache (pour avoir les màj quand en ligne) */
  if(req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html'){
    event.respondWith(
      fetch(req).then(function(resp){
        const clone = resp.clone();
        caches.open(SHELL_CACHE).then(function(cache){ cache.put(req, clone); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  /* Resources externes (fonts, jsPDF) : cache-first puis network */
  if(url.origin !== self.location.origin){
    event.respondWith(
      caches.match(req).then(function(cached){
        if(cached) return cached;
        return fetch(req).then(function(resp){
          if(resp && resp.status === 200 && resp.type !== 'opaque'){
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then(function(cache){
              cache.put(req, clone).catch(function(){});
            });
          }
          return resp;
        }).catch(function(){
          /* Hors-ligne et pas en cache : on laisse le navigateur gérer l'échec */
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  /* Autres ressources de notre origine : cache-first */
  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(resp){
        if(resp && resp.status === 200){
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then(function(cache){
            cache.put(req, clone).catch(function(){});
          });
        }
        return resp;
      }).catch(function(){
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

/* Message handler — permet de forcer le skip waiting depuis l'app */
self.addEventListener('message', function(event){
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
