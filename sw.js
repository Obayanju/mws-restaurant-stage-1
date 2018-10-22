const CACHE_NAME = "restaurant-reviews-cache-v1";
let urlsToCache = [
  "/index.html",
  "/css/styles.css",
  "/js/main.js",
  "/js/dbhelper.js",
  "/js/restaurant_info.js"
];

self.addEventListener("install", event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      let fetchRequest = event.request.clone();
      return fetch(fetchRequest).then(response => {
        //   check if we received a valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // cummulatively cache responses
        // send one response to the cache and another to the browser
        let responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
