/* Customer Care Management app: works offline with the latest version you opened.
   Always tries the internet first, so weekly uploads appear straight away. */
const CACHE = "ccm-app-v2";
const CORE = ["./", "./index.html", "./level5/", "./level5/index.html", "./level4/", "./level4/index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match(url.pathname.includes("/level5/") ? "./level5/index.html" : "./index.html") : undefined))));
});
