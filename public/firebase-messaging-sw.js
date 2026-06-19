/* eslint-disable no-undef */
// Firebase Cloud Messaging background service worker.
//
// This file is served verbatim from /firebase-messaging-sw.js (it lives in
// public/). A service worker is a plain script: it CANNOT read import.meta.env,
// so the Firebase web config below must be hard-coded.
//
// SECURITY — public by design (NOT a leaked secret):
//   These are Firebase *client* config values. By design they are public:
//   the identical values already ship to every browser in the app bundle via
//   VITE_FIREBASE_*, and Google intends web API keys to be exposed. They are
//   NOT credentials and grant no access on their own. All data access is
//   enforced server-side by Firestore Security Rules (see firestore.rules,
//   which default-denies and scopes every collection to the authenticated
//   owner/household). Committing these values here is safe.
//
// MAINTENANCE: keep these in sync with the VITE_FIREBASE_* values in .env.
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyBQI62vIhwIHuzuc9uH0HzCXGHGoxGYShQ",
  authDomain: "zerowastehome-v2.firebaseapp.com",
  projectId: "zerowastehome-v2",
  storageBucket: "zerowastehome-v2.firebasestorage.app",
  messagingSenderId: "134447925690",
  appId: "1:134447925690:web:55bff5ecf997a0074a3583",
});

const messaging = firebase.messaging();

// Fired when a push arrives while the app is in the background / closed.
// For `notification` payloads the browser auto-displays; we handle `data`-only
// payloads here so the Cloud Function can send either shape.
messaging.onBackgroundMessage((payload) => {
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "ZeroWasteHome";
  const options = {
    body:
      payload?.notification?.body ||
      payload?.data?.body ||
      "You have items expiring soon.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: payload?.data || {},
  };

  self.registration.showNotification(title, options);
});

// Focus or open the app when the user taps a notification — and ALWAYS land on
// the notification's target URL, even when a window is already open elsewhere.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/home";
  // Resolve against the SW origin so we can compare full URLs and so
  // client.navigate() receives an absolute, same-origin URL.
  const absoluteTarget = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 1. A window already on the target URL: just focus it.
        const onTarget = clientList.find((client) => client.url === absoluteTarget);
        if (onTarget) return onTarget.focus();

        // 2. Any other open window: navigate it to the target, then focus.
        //    Previously we only focused, so clicking a /home notification while
        //    the app sat on /settings left the user on /settings.
        const anyClient = clientList.find((client) => "focus" in client);
        if (anyClient) {
          const focused = anyClient.focus();
          if (typeof anyClient.navigate === "function") {
            return Promise.resolve(focused)
              .then(() => anyClient.navigate(absoluteTarget))
              .catch(() => anyClient);
          }
          return focused;
        }

        // 3. No window open: open a fresh one at the target.
        if (self.clients.openWindow) return self.clients.openWindow(absoluteTarget);
        return undefined;
      }),
  );
});
