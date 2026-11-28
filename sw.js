/* Service worker: keeps the app files on the device so repeat visits start at once and use almost no data.
   - the files named with a hash (assets/…) are immutable: cache first
   - the page itself (index.html) is network first (so a new release is picked up) with a short wait, then the saved copy
   - data (Supabase) and everything on other websites is NOT touched here (the app has its own data cache) */
const VER = 'mwx4rsyn-d3794bcf', PRE = ["./","index.html","assets/style.86861c55.css","assets/app.3fd01a8b.js","assets/supabase.34035ac7.js","assets/inter-latin.f11d729b.woff2","assets/jakarta-latin.a389d97d.woff2","manifest.webmanifest"], KEEP = 2;
self.addEventListener('install', e => e.waitUntil(caches.open('li-' + VER).then(c => c.addAll(PRE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil((async () => {
  const mine = 'li-' + VER, all = (await caches.keys()).filter(k => k.startsWith('li-') && k !== mine).sort().reverse();
  await Promise.all(all.slice(KEEP - 1).map(k => caches.delete(k)));       /* keep this and the previous version (an old open page may still ask for its files) */
  await self.clients.claim();
})()));
const own = new URL(self.registration.scope).pathname;
async function put(req, res) { if (res && res.ok && res.type === 'basic') { const c = await caches.open('li-' + VER); await c.put(req, res.clone()); } return res; }
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.startsWith(own + 'assets/')) {
    e.respondWith(caches.match(r).then(h => h || fetch(r).then(res => put(r, res))));
    return;
  }
  if (r.mode === 'navigate' || u.pathname === own || u.pathname === own + 'index.html') {
    e.respondWith((async () => {
      const key = new Request(own + 'index.html');
      try {
        const res = await Promise.race([fetch(r), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 3500))]);
        if (res && res.ok) { const c = await caches.open('li-' + VER); c.put(key, res.clone()); }
        return res;
      } catch (err) {
        return (await caches.match(key)) || (await caches.match('index.html')) || Response.error();
      }
    })());
    return;
  }
  /* manifest, icons … : saved copy first, refreshed in the background */
  e.respondWith(caches.match(r).then(h => { const n = fetch(r).then(res => put(r, res)).catch(() => h); return h || n; }));
});
