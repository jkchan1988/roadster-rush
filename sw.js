/* Roadster Rush v8 service worker: NETWORK-FIRST (3.5 s budget) with a cache fallback, so a fresh publish is always what a connected player runs, and the game still runs
   fully offline once installed. (v4-v7 were cache-first: a returning player kept getting the previous build until a second reload - the likely reason a v7 player
   saw the v6 game with no tunnel.) No network calls beyond these same-origin files. Bump VERSION on every publish; activate deletes every older roadster-rush-* cache. */
var VERSION = 'v8-2';
var CACHE = 'roadster-rush-' + VERSION;
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
var NET_MS = 3500;
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('roadster-rush-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return; // never touch other origins
  e.respondWith(new Promise(function (resolve) {
    var done = false, timer = setTimeout(function () { fromCache(); }, NET_MS);
    function fromCache() { if (done) return; caches.match(e.request, { ignoreSearch: true }).then(function (hit) { if (hit && !done) { done = true; clearTimeout(timer); resolve(hit); } }); }
    fetch(e.request, { cache: 'no-cache' }).then(function (res) {
      if (done) { if (res && res.ok && res.type === 'basic') { var c0 = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, c0); }); } return; }
      if (res && res.ok && res.type === 'basic') { done = true; clearTimeout(timer); var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); resolve(res); }
      else { fromCache(); setTimeout(function () { if (!done) { done = true; resolve(res); } }, 50); }
    }).catch(function () { fromCache(); setTimeout(function () { if (!done) { done = true; resolve(Response.error()); } }, 120); });
  }));
});
