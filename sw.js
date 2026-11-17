// Gerado por build.js. Guarda o jogo, os áudios e as fontes para funcionar sem internet.
const CACHE = "passa-ou-repassa-4bd817a150";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "logo.png",
  "icon-192.png",
  "icon-512.png",
  "audio/pergunta-01.mp3",
  "audio/resposta-01.mp3",
  "audio/pergunta-02.mp3",
  "audio/resposta-02.mp3",
  "audio/pergunta-03.mp3",
  "audio/resposta-03.mp3",
  "audio/pergunta-04.mp3",
  "audio/resposta-04.mp3",
  "audio/pergunta-05.mp3",
  "audio/resposta-05.mp3",
  "audio/pergunta-06.mp3",
  "audio/resposta-06.mp3",
  "audio/pergunta-07.mp3",
  "audio/resposta-07.mp3",
  "audio/pergunta-08.mp3",
  "audio/resposta-08.mp3",
  "audio/pergunta-09.mp3",
  "audio/resposta-09.mp3",
  "audio/pergunta-10.mp3",
  "audio/resposta-10.mp3",
  "audio/pergunta-11.mp3",
  "audio/resposta-11.mp3",
  "audio/pergunta-12.mp3",
  "audio/resposta-12.mp3",
  "audio/pergunta-13.mp3",
  "audio/resposta-13.mp3",
  "audio/pergunta-14.mp3",
  "audio/resposta-14.mp3",
  "audio/pergunta-15.mp3",
  "audio/resposta-15.mp3",
  "audio/pergunta-16.mp3",
  "audio/resposta-16.mp3",
  "audio/pergunta-17.mp3",
  "audio/resposta-17.mp3",
  "audio/pergunta-18.mp3",
  "audio/resposta-18.mp3",
  "audio/pergunta-19.mp3",
  "audio/resposta-19.mp3",
  "audio/pergunta-20.mp3",
  "audio/resposta-20.mp3",
  "audio/pergunta-21.mp3",
  "audio/resposta-21.mp3",
  "audio/pergunta-22.mp3",
  "audio/resposta-22.mp3",
  "audio/pergunta-23.mp3",
  "audio/resposta-23.mp3",
  "audio/pergunta-24.mp3",
  "audio/resposta-24.mp3",
  "audio/pergunta-25.mp3",
  "audio/resposta-25.mp3",
  "audio/pergunta-26.mp3",
  "audio/resposta-26.mp3",
  "audio/pergunta-27.mp3",
  "audio/resposta-27.mp3",
  "audio/pergunta-28.mp3",
  "audio/resposta-28.mp3",
  "audio/pergunta-29.mp3",
  "audio/resposta-29.mp3",
  "audio/pergunta-30.mp3",
  "audio/resposta-30.mp3"
];
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800;900&family=Big+Shoulders+Display:wght@700;800;900&display=swap";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Página e logo primeiro; depois os áudios, um de cada vez para não travar a conexão
    await cache.addAll(FILES.filter((f) => f.indexOf("audio/") !== 0));
    for (const f of FILES.filter((f) => f.indexOf("audio/") === 0)) {
      try { await cache.add(f); } catch (e) {}
    }
    try {
      const css = await fetch(FONT_CSS, { mode: "cors" });
      if (css.ok) {
        const text = await css.clone().text();
        await cache.put(FONT_CSS, css);
        const urls = text.match(/https:\/\/fonts\.gstatic\.com\/[^)'"]+/g) || [];
        await Promise.all(urls.map((u) => fetch(u, { mode: "cors" }).then((r) => r.ok && cache.put(u, r)).catch(() => {})));
      }
    } catch (e) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    const clients = await self.clients.matchAll();
    clients.forEach((c) => c.postMessage("cached"));
  })());
});

// Áudio pede pedaços do arquivo (Range); responde com o trecho certo a partir do cache
async function rangeResponse(request, response) {
  const range = request.headers.get("range");
  if (!range) return response;
  const buf = await response.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const size = buf.byteLength;
  const start = m && m[1] ? parseInt(m[1], 10) : 0;
  const end = m && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": "bytes " + start + "-" + end + "/" + size,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes"
    }
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === "navigate" ? "index.html" : req.url;
    const hit = await cache.match(key, { ignoreSearch: req.mode === "navigate" });
    if (hit) return url.pathname.endsWith(".mp3") ? rangeResponse(req, hit) : hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.status === 200 && (isFont || url.origin === location.origin)) cache.put(req, res.clone());
      return res;
    } catch (e) {
      return new Response("Sem internet e este arquivo não foi salvo.", { status: 504, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
