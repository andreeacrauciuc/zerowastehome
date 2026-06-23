import { useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { STORAGE_KEYS, readLocalArray, writeLocalJson } from "./storage";
import { normalizeError } from "./normalize";

const writeLocal = writeLocalJson;

const byNameAsc = (a, b) => String(a?.name || "").localeCompare(String(b?.name || ""));

const byActionDateDesc = (a, b) => {
  const aTime = Number(new Date(a?.actionDate || a?.createdAt || 0).getTime());
  const bTime = Number(new Date(b?.actionDate || b?.createdAt || 0).getTime());
  return bTime - aTime;
};

export const useFirestoreListeners = ({
  isAuthReady,
  currentUser,
  household,
  isHouseholdReady,
  activeHouseholdId,
  activeOwnerId,
  activeScopeId,
  localModeKey,
  useLocalData,
  setInventoryItems,
  setShoppingItems,
  setImpactHistory,
  setIsLoading,
  setUseLocalData,
  enableLocalData,
  disableLocalData,
  notifyFallback,
}) => {
  useEffect(() => {
    if (!isAuthReady) {
      return undefined;
    }

    const clearDataState = () => {
      setInventoryItems([]);
      setShoppingItems([]);
      setImpactHistory([]);
      setIsLoading(false);
    };

    if (!currentUser?.uid) {
      disableLocalData();
      queueMicrotask(clearDataState);
      return undefined;
    }

    if (currentUser?.householdId && !isHouseholdReady) {
      return undefined;
    }

    const effectiveHouseholdId = household?.id || currentUser?.householdId || null;

    const localInventory = readLocalArray(STORAGE_KEYS.inventory);
    const localShopping = readLocalArray(STORAGE_KEYS.shopping);
    const localImpact = readLocalArray(STORAGE_KEYS.impact);
    const hasLocalData =
      localInventory.length > 0 || localShopping.length > 0 || localImpact.length > 0;
    const persistedLocalMode = localStorage.getItem(localModeKey) === "true";

    if (persistedLocalMode && hasLocalData) {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        disableLocalData();
      } else {
        setUseLocalData(true);
        queueMicrotask(() => setIsLoading(false));
        return undefined;
      }
    } else if (persistedLocalMode && !hasLocalData) {
      disableLocalData();
      queueMicrotask(clearDataState);
      return undefined;
    }

    if (useLocalData) {
      queueMicrotask(() => setIsLoading(false));
      return undefined;
    }

    if (!activeScopeId) {
      queueMicrotask(clearDataState);
      return undefined;
    }

    if (localInventory.length > 0) setInventoryItems(localInventory);
    if (localShopping.length > 0) setShoppingItems(localShopping);
    if (localImpact.length > 0) setImpactHistory(localImpact);

    let hasFallenBack = false;

    const fallbackToLocal = (error) => {
      if (hasFallenBack) return;
      hasFallenBack = true;
      console.error("useDataStore: Firestore listener failed, switching to local mode", error);
      enableLocalData();
      notifyFallback(`Cloud sync unavailable. Showing local data. ${normalizeError(error)}`);
      setIsLoading(false);
    };

    const unsubs = [];

    try {
      const inventoryMap = new Map();
      const shoppingMap = new Map();
      const impactMap = new Map();

      const attachListeners = (collectionName, map, onMerged) => {
        const handleSnap = (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === "removed") {
              map.delete(change.doc.id);
            } else {
              map.set(change.doc.id, { ...change.doc.data(), id: change.doc.id });
            }
          });
          onMerged();
          setIsLoading(false);
        };
        unsubs.push(
          onSnapshot(
            query(collection(db, collectionName), where("ownerId", "==", activeOwnerId)),
            handleSnap,
            (error) => fallbackToLocal(error)
          )
        );

        if (effectiveHouseholdId) {
          unsubs.push(
            onSnapshot(
              query(collection(db, collectionName), where("householdId", "==", effectiveHouseholdId)),
              handleSnap,
              (error) => fallbackToLocal(error)
            )
          );
        }
      };

      attachListeners("inventory", inventoryMap, () => {
        const next = Array.from(inventoryMap.values()).sort(byNameAsc);
        setInventoryItems(next);
        writeLocal(STORAGE_KEYS.inventory, next);
      });

      attachListeners("shopping", shoppingMap, () => {
        const next = Array.from(shoppingMap.values());
        setShoppingItems((prev) => {
          const optimisticItems = prev.filter((item) =>
            String(item.id).startsWith("optimistic-")
          );
          const realNames = new Set(
            next.map((item) => String(item.name || "").trim().toLowerCase())
          );
          const pendingOptimistic = optimisticItems.filter(
            (item) => !realNames.has(String(item.name || "").trim().toLowerCase())
          );
          const merged = [...next, ...pendingOptimistic];
          writeLocal(STORAGE_KEYS.shopping, merged);
          return merged;
        });
      });

      attachListeners("impact", impactMap, () => {
        const next = Array.from(impactMap.values()).sort(byActionDateDesc);
        setImpactHistory(next);
        writeLocal(STORAGE_KEYS.impact, next);
      });
    } catch (error) {
      console.error("useDataStore: failed to attach listeners", error);
      fallbackToLocal(error);
    }

    return () => {
      unsubs.forEach((unsub) => unsub?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeHouseholdId,
    activeOwnerId,
    currentUser?.uid,
    currentUser?.householdId,
    household?.id,
    disableLocalData,
    localModeKey,
    enableLocalData,
    notifyFallback,
    isAuthReady,
  ]);
};
