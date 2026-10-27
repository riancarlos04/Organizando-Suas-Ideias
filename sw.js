// =========================================================
// Service worker: guarda os arquivos do site no celular
// para ele abrir rápido e funcionar mesmo sem internet.
// Sempre tenta a versão mais nova primeiro (internet) e só
// usa a cópia guardada quando está sem conexão.
// =========================================================
const CACHE = 'organizando-v16';
const ARQUIVOS = [
  './',
  'index.html',
  'css/estilo.css',
  'js/cronograma.js',
  'js/metas.js',
  'js/progresso.js',
  'js/ia.js',
  'js/resumos.js',
  'js/questionarios.js',
  'js/perfil.js',
  'js/professor.js',
  'js/app.js',
  'manifest.webmanifest',
  'icones/logo.png',
  'icones/icone-apple.png',
  'icones/icone-192.png',
  'icones/icone-512.png'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(ARQUIVOS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (evento) {
  // Apaga cópias de versões antigas
  evento.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (evento) {
  // Pedidos para a IA (api/...) nunca são guardados
  if (evento.request.method !== 'GET' || evento.request.url.indexOf('/api/') !== -1) return;
  evento.respondWith(
    fetch(evento.request)
      .then(function (resposta) {
        const copia = resposta.clone();
        caches.open(CACHE).then(function (cache) { cache.put(evento.request, copia); });
        return resposta;
      })
      .catch(function () {
        return caches.match(evento.request).then(function (r) { return r || caches.match('index.html'); });
      })
  );
});
