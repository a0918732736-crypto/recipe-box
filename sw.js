// Minimal offline shell for 食譜收藏盒.
//
// Strategy: network-first, falling back to cache only when offline. This is
// deliberate -- all the recipe data lives in the page's own localStorage
// (see the app's local-backup code), not in this cache, so there's no risk
// of the cache going stale in a way that loses data. Network-first just
// means: whenever a connection is available, always load the latest
// deployed version of the page (so fixes reach this device right away),
// and only fall back to the last-seen copy when there's genuinely no
// network -- e.g. opened from the home screen with no signal.
const CACHE_NAME = "recipe-box-shell-v1";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(SHELL_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  // Only handle same-origin requests -- let Google Fonts and anything else
  // go straight to the network with normal browser caching.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match("./index.html");
      });
    })
  );
});
