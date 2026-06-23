/* eslint-disable no-undef */

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

messaging.onBackgroundMessage((payload) => {
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "ZeroWasteHome";
  const options = {
    body:
      payload?.notification?.body ||
      payload?.data?.body ||
      "You have items expiring soon",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: payload?.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/home";
  const absoluteTarget = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const onTarget = clientList.find((client) => client.url === absoluteTarget);
        if (onTarget) return onTarget.focus();

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

        if (self.clients.openWindow) return self.clients.openWindow(absoluteTarget);
        return undefined;
      }),
  );
});
