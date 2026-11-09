/* 听得清 ClearHear · Service Worker
   v1.5.0：品牌改版，缓存名必须与旧版 heardit-v1.4.56 区分，否则老用户
   永远看到缓存里的旧名字与旧图标。
   策略：页面导航 network-first（保证更新及时），静态资源 cache-first
   （保证离线可用）；不再用 confirm 或自动 reload 打断正在进行的助听。 */
const CACHE = 'clearhear-v1.5.0';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-a-ear-wave.svg'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // 单个资源失败不应让整个安装失败
      Promise.all(PRECACHE.map(u => c.add(u).catch(() => null)))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面：优先网络，离线时回落缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
        }
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match('./index.html'))
      )
    );
    return;
  }

  // 静态资源：优先缓存，未命中则请求并写入
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.action === 'skipWaiting') self.skipWaiting();
});
