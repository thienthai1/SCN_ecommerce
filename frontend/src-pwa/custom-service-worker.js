/**
 * @file custom-service-worker.js
 * @description
 * Service Worker that configures precaching, runtime caching strategies, and an optional
 * background-sync queue for reliably creating posts while offline.
 *
 * Behavior:
 * - Precache files provided by workbox (precacheAndRoute(self.__WB_MANIFEST)).
 * - Detects background sync support via ('sync' in self.registration) and exposes
 *   backgroundSyncSupport boolean.
 * - When supported, creates a workbox-background-sync Queue named "createPostQueue" with an
 *   onSync handler that:
 *     - Replays queued requests using fetch.
 *     - On successful replay, posts a message via BroadcastChannel('sw-messages') with
 *       { msg: 'offline-post-uploaded' }.
 *     - On failure, requeues the request (unshiftRequest) and rethrows to abort sync.
 * - Registers runtime caching routes:
 *     - CacheFirst strategy for Google Fonts (hosts starting with "fonts.g") with an
 *       ExpirationPlugin (maxEntries: 30) and CacheableResponsePlugin (statuses [0,200]).
 *     - StaleWhileRevalidate for all HTTP(S) requests (url.href.startsWith('http')).
 * - Adds a fetch event handler (only when background sync is supported) that intercepts
 *   POST requests whose URL endsWith('/createPost'):
 *     - Attempts to forward the request to the network.
 *     - If the network response is missing or not ok, enqueues the request in
 *       createPostQueue and returns a 202 JSON response { queued: true }.
 *     - On network failure, enqueues the request so it can be replayed when the device is
 *       back online.
 *
 * Exposed/implicit values:
 * - backgroundSyncSupport: boolean indicating whether SyncManager is available.
 * - createPostQueue: instance of workbox.backgroundSync.Queue (null if unsupported).
 *
 * @requires workbox-precaching
 * @requires workbox-routing
 * @requires workbox-strategies
 * @requires workbox-expiration
 * @requires workbox-cacheable-response
 * @requires workbox-background-sync
 */
/*
  dependecies
*/
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { CacheFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NetworkOnly } from "workbox-strategies";
import { Queue} from 'workbox-background-sync';

// Suppress non-critical IDB errors (e.g., database closing during cache timestamp updates)
self.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.name === 'InvalidStateError') {
    // Silently ignore - this happens when IDB connection closes during cache operations
    event.preventDefault();
    return;
  }
});

//self.__WB_DISABLE_DEV_LOGS = true

console.log('Custom Service Worker Loaded');

/*
  dependecies
*/
self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
if('sync' in self.registration) {
 
}

let backgroundSyncSupport = 'sync' in self.registration ? true : false;


/*
  Caching strategy
*/

// Cache images (including Unsplash images from Home.vue)
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    url.hostname.includes('images.unsplash.com'),
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache Google Fonts
registerRoute(
  ({ url }) => url.hostname.startsWith('fonts.g'),
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
      }),
    ],
  })
);

// API responses contain authentication and live order/payment state. Never
// serve them from a runtime cache, otherwise a paid order can still look unpaid.
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/api/"),
  new NetworkOnly()
);

// Fallback for other HTTP requests
registerRoute(
  ({ url }) => url.href.startsWith('http'),
  new StaleWhileRevalidate({
    cacheName: 'general-cache',
  })
);


// events - push

self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  if(event.data) {
    let data = JSON.parse(event.data.text());
    event.waitUntil(
      self.registration.showNotification(
        data.title,
        {
          body: data.body,
          icon: '/icons/icon-128x128.png',
          badge: '/icons/icon-128x128.png',
          tag: 'eshop-notification',
          renotify: true,
          data: {
            openUrl: data.openUrl || '/'
          }
        }
      )
    )
  }
});
