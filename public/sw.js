// Service worker de Quedada KDD: la app funciona instalada, abre sin conexión y muestra los avisos.
const VERSION = "kdd-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/badge-96.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k !== "kdd-meta") await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    // Primero la red (para tener siempre la última versión); sin conexión, la copia guardada
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put("/", copy));
      return r;
    }).catch(() => caches.match("/", { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});

/* ---------- avisos ---------- */
async function getLast() {
  const r = await (await caches.open("kdd-meta")).match("/__last");
  return r ? Number(await r.text()) || 0 : 0;
}
async function setLast(t) {
  await (await caches.open("kdd-meta")).put("/__last", new Response(String(t)));
}

self.addEventListener("push", e => {
  e.waitUntil((async () => {
    let items = [];
    try {
      const r = await fetch("/api/inbox", { credentials: "include", cache: "no-store" });
      if (r.ok) items = (await r.json()).items || [];
    } catch {}
    const last = await getLast();
    const since = last || Date.now() - 10 * 60 * 1000; // dispositivo nuevo: solo lo reciente
    let fresh = items.filter(i => i.at > since).sort((a, b) => a.at - b.at).slice(-3);
    if (items.length) await setLast(Math.max(last, ...items.map(i => i.at)));
    if (!fresh.length) fresh = [{ title: "Quedada KDD", body: "Hay novedades en tus KDD.", url: "/", tag: "kdd" }];
    await Promise.all(fresh.map(i => self.registration.showNotification(i.title, {
      body: i.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: i.tag || undefined,
      renotify: !!i.tag,
      data: { url: i.url || "/" },
    })));
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if ("focus" in w) { await w.focus(); if ("navigate" in w) await w.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});
