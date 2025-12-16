const CACHE_NAME = 'kmemo-app-final-v1'; // Nome novo para forçar atualização
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png',
  // Links externos (Fontes e PDF)
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Patrick+Hand&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// 1. Instalação: Baixa os arquivos para o celular
self.addEventListener('install', (evt) => {
  // Força o SW novo a assumir imediatamente
  self.skipWaiting();
  
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cacheando arquivos...');
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Ativação: Limpa versões antigas do cache
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  // Garante que o SW controle todas as abas abertas
  return self.clients.claim();
});

// 3. Interceptação: Serve arquivos do cache quando offline
self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((cacheRes) => {
      // Se tiver no cache, retorna. Se não, busca na rede.
      return cacheRes || fetch(evt.request);
    }).catch(() => {
      // Se falhar tudo (offline e sem cache), poderia retornar uma página de erro customizada
      // mas para este app, o cache deve bastar.
    })
  );
});
