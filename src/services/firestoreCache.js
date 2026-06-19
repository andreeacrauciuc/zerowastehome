import { getDoc } from "firebase/firestore";

const cache = new Map();
let cacheScope = "anonymous";

const now = () => Date.now();

const buildKey = (keyParts) =>
  [cacheScope || "anonymous", ...keyParts].filter(Boolean).join("::");

const resetCache = () => {
  cache.clear();
};

export const setFirestoreCacheScope = (scope) => {
  const nextScope = scope || "anonymous";
  if (cacheScope !== nextScope) {
    cacheScope = nextScope;
    resetCache();
  }
};

export const clearFirestoreCache = () => {
  resetCache();
};

export const getCachedDocData = async ({ keyParts, docRef, ttlMs = 2 * 60 * 1000 }) => {
  const key = buildKey(keyParts);
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now()) {
    return cached.value;
  }

  const snap = await getDoc(docRef);
  const value = snap.exists() ? { id: snap.id, ...snap.data() } : null;
  cache.set(key, { value, expiresAt: now() + ttlMs });
  return value;
};

export const invalidateCachedDocData = (...keyParts) => {
  const prefix = buildKey(keyParts);
  if (!prefix) return;

  Array.from(cache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  });
};
