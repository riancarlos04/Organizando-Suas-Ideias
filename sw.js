// =========================================================
// Service worker: só guarda os ícones e o manifest (arquivos
// que quase nunca mudam). O HTML, o CSS e os scripts sempre
// vêm direto da internet, para nunca misturar versões antigas
// e novas do app depois de uma atualização.
// =========================================================
const CACHE = 'organizando-v19';
const ARQUIVOS = [
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
  // Apaga cópias de versões antigas (inclusive do formato antigo, que guardava HTML/JS)
  evento.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (evento) {
  const url = evento.request.url;
  const ehArquivoGuardado = evento.request.method === 'GET' && ARQUIVOS.some(function (a) { return url.indexOf(a) !== -1; });
  if (!ehArquivoGuardado) return; // deixa o navegador buscar normalmente na internet
  evento.respondWith(
    caches.match(evento.request).then(function (r) { return r || fetch(evento.request); })
  );
});
