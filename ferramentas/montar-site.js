// Monta o site a partir de ferramentas/pagina.html (a mesma página do artifact no Claude):
// index.html, sw.js, manifest.webmanifest e audio/roteiro-audios.csv.
// Rode depois de qualquer mudança: node ferramentas/montar-site.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const src = path.join(__dirname, "pagina.html");
const out = path.join(__dirname, "..");
const page = fs.readFileSync(src, "utf8");

// Confere a sintaxe do script e carrega as perguntas
const script = page.slice(page.indexOf("<script>") + 8, page.lastIndexOf("</script>"));
new Function(script);
const data = script.slice(script.indexOf("/*DATA*/"), script.indexOf("/*END-DATA*/"));
const { Q, L, perguntaText, respostaText } = new Function(data + "; return { Q, L, perguntaText, respostaText };")();
if (Q.length !== 30) throw new Error("Esperava 30 perguntas, achei " + Q.length);
Q.forEach((q, i) => { if (q.o.length !== 4 || q.c < 0 || q.c > 3 || !q.e) throw new Error("Pergunta " + (i + 1) + " incompleta"); });

fs.mkdirSync(path.join(out, "audio"), { recursive: true });

// Roteiro dos áudios (CSV com ; e BOM, abre direto no Excel)
const cell = (s) => '"' + s.replace(/"/g, '""') + '"';
const rows = ["arquivo;texto"];
const audios = [];
Q.forEach((q, i) => {
  const n = String(i + 1).padStart(2, "0");
  rows.push("pergunta-" + n + ".mp3;" + cell(perguntaText(q)));
  rows.push("resposta-" + n + ".mp3;" + cell(respostaText(q)));
  audios.push("audio/pergunta-" + n + ".mp3", "audio/resposta-" + n + ".mp3");
});
fs.writeFileSync(path.join(out, "audio", "roteiro-audios.csv"), "﻿" + rows.join("\r\n") + "\r\n", "utf8");

// PWA: registra o service worker, mostra se o jogo já está salvo no aparelho e oferece a instalação
const pwaScript = `<script>
(function () {
  var box = document.getElementById("offline");
  var status = document.getElementById("offline-status");
  var install = document.getElementById("btn-install");
  var TOTAL = ${audios.length};
  function say(text, ready) { box.hidden = false; status.textContent = text; status.dataset.state = ready ? "ready" : ""; }
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  say("Salvando o jogo e os áudios neste aparelho para funcionar sem internet...");
  function check() {
    if (!window.caches) return;
    caches.keys().then(function (keys) {
      var key = keys.filter(function (k) { return k.indexOf("passa-ou-repassa-") === 0; }).pop();
      if (!key) return;
      return caches.open(key).then(function (c) { return c.keys(); }).then(function (reqs) {
        var n = reqs.filter(function (r) { return /\\/audio\\/.*\\.mp3$/.test(r.url); }).length;
        if (n >= TOTAL) say("Pronto para jogar sem internet: jogo e " + n + " áudios salvos neste aparelho.", true);
        else say("Salvando para jogar sem internet: " + n + " de " + TOTAL + " áudios...");
      });
    }).catch(function () {});
  }
  navigator.serviceWorker.register("sw.js").then(function () {
    navigator.serviceWorker.ready.then(check);
  }).catch(function () { say("Este navegador não deixou salvar o jogo para usar sem internet."); });
  navigator.serviceWorker.addEventListener("message", function (e) { if (e.data === "cached") check(); });
  var timer = setInterval(check, 1500);
  setTimeout(function () { clearInterval(timer); }, 120000);
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; install.hidden = false; box.hidden = false; });
  install.addEventListener("click", function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.finally(function () { deferred = null; install.hidden = true; });
  });
  window.addEventListener("appinstalled", function () { install.hidden = true; });
})();
</script>`;

// index.html
const cut = page.indexOf("</style>") + "</style>".length;
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#15100B">
<meta name="description" content="Passa ou Repassa da Consciência Negra do CEPESM">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icon-192.png">
<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${page.slice(0, cut)}
</head>
<body>
${page.slice(cut).trim()}
${pwaScript}
</body>
</html>
`;
fs.writeFileSync(path.join(out, "index.html"), html, "utf8");

// manifest.webmanifest
fs.writeFileSync(path.join(out, "manifest.webmanifest"), JSON.stringify({
  name: "Passa ou Repassa da Consciência Negra",
  short_name: "Passa ou Repassa",
  description: "Jogo de Passa ou Repassa do CEPESM para o Dia da Consciência Negra",
  lang: "pt-BR",
  start_url: "./",
  scope: "./",
  display: "fullscreen",
  orientation: "landscape",
  background_color: "#15100B",
  theme_color: "#15100B",
  icons: [
    { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2) + "\n", "utf8");

// sw.js: a versão do cache muda sempre que algum arquivo muda
const local = ["./", "index.html", "manifest.webmanifest", "logo.png", "icon-192.png", "icon-512.png"]
  .concat(audios.filter((a) => fs.existsSync(path.join(out, a))));
const hash = crypto.createHash("sha1");
local.filter((f) => f !== "./").forEach((f) => {
  const p = path.join(out, f);
  hash.update(f);
  if (fs.existsSync(p)) hash.update(fs.readFileSync(p));
});
const version = hash.digest("hex").slice(0, 10);
const fontCss = (page.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/) || [""])[0].replace(/&amp;/g, "&");

const sw = `// Gerado por build.js. Guarda o jogo, os áudios e as fontes para funcionar sem internet.
const CACHE = "passa-ou-repassa-${version}";
const FILES = ${JSON.stringify(local, null, 2)};
const FONT_CSS = ${JSON.stringify(fontCss)};

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
        const urls = text.match(/https:\\/\\/fonts\\.gstatic\\.com\\/[^)'"]+/g) || [];
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
  const m = /bytes=(\\d*)-(\\d*)/.exec(range);
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
`;
fs.writeFileSync(path.join(out, "sw.js"), sw, "utf8");
new Function(sw);   // só confere a sintaxe, não executa

// Gabarito para conferência
console.log("Gabarito: " + Q.map((q, i) => (i + 1) + L[q.c]).join(" "));
console.log("Cache " + version + ": " + local.length + " arquivos (" + local.filter((f) => f.startsWith("audio/")).length + " áudios)");
console.log("Arquivos gravados em " + out);
