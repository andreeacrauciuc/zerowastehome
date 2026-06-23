import { useCallback, useEffect, useRef, useState } from "react";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { app, db } from "../firebase/firebaseConfig";
import { useAuth } from "../features/auth/context/AuthContext";
import { showSuccess } from "../utils/toast";
import { setActiveFcmToken } from "../services/fcmTokenRegistry";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const FCM_SW_URL = "/firebase-messaging-sw.js";


const registerMessagingServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register(FCM_SW_URL);
};

/**
 * @param {{ autoRegister?: boolean }} [options]
 */
export function usePushNotifications({ autoRegister = true } = {}) {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [token, setToken] = useState(null);
  const [isSupportedState, setIsSupportedState] = useState(false);
  const [error, setError] = useState(null);
  const savedForUidRef = useRef(null);

  useEffect(() => {
    let active = true;
    isSupported()
      .then((supported) => {
        if (active) setIsSupportedState(Boolean(supported));
      })
      .catch(() => {
        if (active) setIsSupportedState(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const uid = currentUser?.uid;

  const fetchAndSaveToken = useCallback(async () => {
    if (!uid) return null;
    if (!isSupportedState) return null;
    if (typeof Notification === "undefined") return null;
    if (Notification.permission !== "granted") return null;
    if (!VAPID_KEY) {
      setError(new Error("Missing VITE_FIREBASE_VAPID_KEY"));
      return null;
    }

    try {
      const registration = await registerMessagingServiceWorker();
      const messaging = getMessaging(app);
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration || undefined,
      });

      if (!fcmToken) return null;
      setToken(fcmToken);
      setActiveFcmToken(fcmToken);

      if (savedForUidRef.current !== `${uid}:${fcmToken}`) {
        await setDoc(
          doc(db, "users", uid),
          { fcmTokens: arrayUnion(fcmToken) },
          { merge: true },
        );
        savedForUidRef.current = `${uid}:${fcmToken}`;
      }
      return fcmToken;
    } catch (err) {
      setError(err);
      return null;
    }
  }, [uid, isSupportedState]);

  const requestPermissionAndRegister = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        await fetchAndSaveToken();
      }
      return result;
    } catch (err) {
      setError(err);
      return "default";
    }
  }, [fetchAndSaveToken]);

  useEffect(() => {
    if (!autoRegister) return undefined;
    if (!isSupportedState || !uid) return undefined;
    if (typeof Notification === "undefined") return undefined;
    if (Notification.permission !== "granted") return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchAndSaveToken();
    });
    return () => {
      active = false;
    };
  }, [autoRegister, isSupportedState, uid, fetchAndSaveToken]);

  useEffect(() => {
    if (!isSupportedState) return undefined;
    let unsubscribe;
    try {
      const messaging = getMessaging(app);
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload?.notification?.title || payload?.data?.title;
        const body = payload?.notification?.body || payload?.data?.body;
        showSuccess([title, body].filter(Boolean).join(" — ") || "New notification");
      });
    } catch {
      // getMessaging can throw in unsupported environments; ignore safely.
    }
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isSupportedState]);

  return {
    isSupported: isSupportedState,
    permission,
    token,
    error,
    requestPermissionAndRegister,
  };
}

export default usePushNotifications;
