import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { db } from "../services/firebase";
import { collection, doc, addDoc, setDoc, increment, writeBatch } from "firebase/firestore";
import { useAuth } from "../features/auth/context/AuthContext";
import { useHousehold } from "../features/household/HouseholdContext";
import { normalizeProductForStorage } from "../utils/productNormalizer";
import { validateInventoryItem } from "../utils/validation";
import { showSuccess } from "../utils/toast";
import { t } from "../locales";
import { STORAGE_KEYS, createLocalId, readLocalArray, writeLocalJson } from "./dataStore/storage";
import { normalizeError, toSafePrice, toSafeQuantity } from "./dataStore/normalize";
import { useFirestoreListeners } from "./dataStore/useFirestoreListeners";
import { useScopeRepair } from "./dataStore/useScopeRepair";
import {
  applyInventoryUsageWrites,
  archiveInventoryActionTransaction,
  batchDeleteScopedDocs,
  batchUpdateScopedDocs,
  deleteScopedDoc,
  moveShoppingToInventoryTransaction,
  updateScopedDoc,
} from "../services/dataWriteService";
import { buildCrossListDuplicateGuard, normalizeItemName } from "../utils/itemDeduplication";

const categoryIcons = {
  Fruits: "\uD83C\uDF47",
  Vegetables: "\uD83E\uDD66",
  Meat: "\uD83E\uDD69",
  Dairy: "\uD83E\uDD5B",
  Bakery: "\uD83E\uDE50",
  Grains: "\uD83C\uDF5E",
  Other: "\uD83D\uDCE6",
};

const writeLocal = writeLocalJson;

const normalizeUnit = (value) => String(value || "").trim().toLowerCase();

const toBaseUnit = (amount, unit) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;

  const normalized = normalizeUnit(unit);
  if (normalized === "g" || normalized === "gr") return { quantity: Number((value / 1000).toFixed(4)), unit: "kg" };
  if (normalized === "kg") return { quantity: Number(value.toFixed(4)), unit: "kg" };
  if (normalized === "ml") return { quantity: Number((value / 1000).toFixed(4)), unit: "l" };
  if (normalized === "l") return { quantity: Number(value.toFixed(4)), unit: "l" };

  return { quantity: Number(value.toFixed(4)), unit: normalized || "unit" };
};

const convertQuantityToUnit = (amount, fromUnit, toUnit) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;

  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to || from === to) return value;

  const massUnits = { g: 1, gr: 1, kg: 1000 };
  const volumeUnits = { ml: 1, l: 1000 };

  if (massUnits[from] && massUnits[to]) {
    return Number(((value * massUnits[from]) / massUnits[to]).toFixed(4));
  }
  if (volumeUnits[from] && volumeUnits[to]) {
    return Number(((value * volumeUnits[from]) / volumeUnits[to]).toFixed(4));
  }

  return value;
};

const hasCorruptedTinyQuantity = (item) => {
  const initialQuantity = Number(item?.initialQuantity);
  return Number.isFinite(initialQuantity) && initialQuantity > 0 && initialQuantity < 0.1;
};

const estimateUnitPrice = (item) => {
  const price = Number(item?.price);

  if (hasCorruptedTinyQuantity(item)) {
    const currentQty = Number(item?.quantity);
    const saneQty = Number.isFinite(currentQty) && currentQty >= 1 ? currentQty : 1;
    if (Number.isFinite(price) && price > 0) {
      return Number((price / saneQty).toFixed(4));
    }
  }

  const unitPrice = Number(item?.unitPrice);
  if (Number.isFinite(unitPrice) && unitPrice > 0) return unitPrice;

  const initialQuantity = Number(item?.initialQuantity);
  if (Number.isFinite(price) && price > 0 && Number.isFinite(initialQuantity) && initialQuantity > 0) {
    return Number((price / initialQuantity).toFixed(4));
  }

  const currentQty = Number(item?.quantity);
  if (Number.isFinite(price) && price > 0 && Number.isFinite(currentQty) && currentQty > 0) {
    return Number((price / currentQty).toFixed(4));
  }

  const estimated = Number(item?.estimatedPrice);
  if (Number.isFinite(estimated) && estimated > 0 && Number.isFinite(currentQty) && currentQty > 0) {
    return Number((estimated / currentQty).toFixed(4));
  }

  console.warn(
    "useDataStore: estimateUnitPrice found no usable price; moneySaved will treat this item as free.",
    { id: item?.id, name: item?.name },
  );
  return 0;
};

const buildMergedShoppingChanges = (existing, payload) => {
  const mergedQuantity = Number(
    (toSafeQuantity(existing?.quantity, 0) + toSafeQuantity(payload?.quantity, 0)).toFixed(2)
  );

  const existingPrice = toSafePrice(existing?.estimatedPrice);
  const incomingPrice = toSafePrice(payload?.estimatedPrice);

  return {
    quantity: mergedQuantity,
    estimatedPrice: existingPrice !== null ? existingPrice : incomingPrice,
    checked: Boolean(existing?.checked),
  };
};

const findShoppingDuplicate = (shoppingItems, payload) => {
  const duplicate = buildCrossListDuplicateGuard({
    name: payload?.name,
    shoppingItems,
    inventoryItems: [],
  });
  return duplicate?.matchedItem || null;
};

const buildInventoryFinancialFields = (item) => {
  const purchasedQuantityRaw = Number(item?.purchasedQuantity);
  const quantityRaw = Number(item?.quantity);
  const resolvedQuantity =
    Number.isFinite(purchasedQuantityRaw) && purchasedQuantityRaw > 0
      ? purchasedQuantityRaw
      : Number.isFinite(quantityRaw) && quantityRaw > 0
        ? quantityRaw
        : 1;

  const roundedQuantity = Number(resolvedQuantity.toFixed(2));
  const purchasedQuantity = roundedQuantity >= 0.1 ? roundedQuantity : 1;

  const pricePaidRaw = Number(item?.pricePaid);
  const fallbackPriceRaw = Number(item?.estimatedPrice);
  const pricePaid =
    Number.isFinite(pricePaidRaw) && pricePaidRaw >= 0
      ? Number(pricePaidRaw.toFixed(2))
      : Number.isFinite(fallbackPriceRaw) && fallbackPriceRaw >= 0
        ? Number(fallbackPriceRaw.toFixed(2))
        : 0;

  const unitPrice = purchasedQuantity > 0 ? Number((pricePaid / purchasedQuantity).toFixed(4)) : 0;

  return {
    quantity: purchasedQuantity,
    price: pricePaid,
    unitPrice,
    initialQuantity: purchasedQuantity,
    initialInvestment: pricePaid,
    investedValueLeft: pricePaid,
    consumedValue: 0,
  };
};

const applyUsageToInventory = (items, usedInventory) => {
  const usageById = new Map();
  const usageByName = new Map();

  (usedInventory || []).forEach((used) => {
    const qty = Number(used?.quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;

    if (used?.id) {
      usageById.set(used.id, (usageById.get(used.id) || 0) + qty);
      return;
    }

    const nameKey = normalizeItemName(used?.name);
    if (!nameKey) return;
    usageByName.set(nameKey, (usageByName.get(nameKey) || 0) + qty);
  });

  if (usageById.size === 0 && usageByName.size === 0) return items;

  const next = [];
  items.forEach((item) => {
    const usedQtyById = usageById.get(item.id) || 0;
    const usedQtyByName = usageByName.get(normalizeItemName(item.name)) || 0;
    const usedQty = usedQtyById || usedQtyByName;

    if (usedQty <= 0) {
      next.push(item);
      return;
    }

    const currentQty = Number(item.quantity) || 0;
    const remaining = Number((currentQty - usedQty).toFixed(2));

    if (remaining > 0) {
      const storedUnitPrice = Number(item.unitPrice);
      const inferredUnitPrice = currentQty > 0 ? (Number(item.price) || 0) / currentQty : 0;
      const unitPrice =
        Number.isFinite(storedUnitPrice) && storedUnitPrice > 0
          ? storedUnitPrice
          : Number.isFinite(inferredUnitPrice) && inferredUnitPrice > 0
            ? inferredUnitPrice
            : 0;

      const initialInvestmentRaw = Number(item.initialInvestment);
      const initialInvestment =
        Number.isFinite(initialInvestmentRaw) && initialInvestmentRaw >= 0
          ? initialInvestmentRaw
          : Number(item.price) || 0;

      const investedValueLeft = Number((remaining * unitPrice).toFixed(2));
      const consumedValue = Number((initialInvestment - investedValueLeft).toFixed(2));

      next.push({
        ...item,
        quantity: remaining,
        unitPrice: Number(unitPrice.toFixed(4)),
        investedValueLeft,
        consumedValue: consumedValue >= 0 ? consumedValue : 0,
      });
    }
  });

  return next;
};

const calculateCookStats = (usedInventory, inventoryItems) => {
  return usedInventory.reduce(
    (acc, used) => {
      const matched = inventoryItems.find((item) => item.id === used.id) || {};
      const qty = Number(used?.quantity) || 0;
      if (qty <= 0) return acc;
      const base = toBaseUnit(qty, used?.unit || matched?.unit || "unit");
      const unitPrice = estimateUnitPrice(matched);
      acc.moneySaved += unitPrice * qty;
      if (base?.unit === "kg" || base?.unit === "l") {
        acc.foodSavedKg += base.quantity;
      }
      return acc;
    },
    { moneySaved: 0, foodSavedKg: 0 }
  );
};

const buildBatchKey = (name, expiry) =>
  `${normalizeItemName(name)}|${String(expiry || "").trim()}`;

const mergePurchasedIntoInventoryLocal = (currentInventory, purchasedItems) => {
  const nextInventory = [...currentInventory];
  let mergedCount = 0;
  let newBatchCount = 0;

  purchasedItems.forEach((item) => {
    const financial = buildInventoryFinancialFields(item);
    const batchKey = buildBatchKey(item?.name, item?.expiry);
    const targetIndex = nextInventory.findIndex(
      (existing) =>
        buildBatchKey(existing?.name, existing?.expiry ?? existing?.expiryDate) === batchKey
    );

    if (targetIndex === -1) {
      newBatchCount += 1;
      const nowIso = new Date().toISOString();
      const expiryValue = item.expiry || null;
      const id = createLocalId();
      nextInventory.unshift({
        id,
        name: item.name,
        category: item.category,
        icon: categoryIcons[item.category] || "📦",
        ...financial,
        unit: item.unit,
        expiry: expiryValue,
        expiryDate: expiryValue,
        purchaseDate: nowIso,
        batchId: id,
        createdAt: nowIso,
      });
      return;
    }

    mergedCount += 1;
    const existing = nextInventory[targetIndex];
    const addedQty = Number(convertQuantityToUnit(financial.quantity, item?.unit, existing?.unit)) || 0;
    const mergedQuantity = Number(((Number(existing.quantity) || 0) + addedQty).toFixed(2));
    const mergedPrice = Number(((Number(existing.price) || 0) + financial.price).toFixed(2));
    const mergedUnitPrice = mergedQuantity > 0 ? Number((mergedPrice / mergedQuantity).toFixed(4)) : 0;

    nextInventory[targetIndex] = {
      ...existing,
      quantity: mergedQuantity,
      price: mergedPrice,
      unitPrice: mergedUnitPrice,
      initialQuantity: Number(
        ((Number(existing.initialQuantity) || Number(existing.quantity) || 0) + addedQty).toFixed(2)
      ),
      initialInvestment: Number(
        ((Number(existing.initialInvestment) || Number(existing.price) || 0) + financial.price).toFixed(2)
      ),
      investedValueLeft: Number(
        ((Number(existing.investedValueLeft) || Number(existing.price) || 0) + financial.price).toFixed(2)
      ),
    };
  });

  return { nextInventory, mergedCount, newBatchCount };
};

const filterByScope = (items, { contextMode, uid, householdId }) => {
  if (!Array.isArray(items)) return [];

  if (contextMode === "household" && householdId) {
    return items.filter((item) => item?.householdId === householdId);
  }

  if (!uid) return [];
  return items.filter((item) => {
    const owner = item?.ownerId ?? item?.userId;
    return owner === uid;
  });
};

const DataStoreContext = createContext(null);

const useDataStoreState = () => {
  const { currentUser, isAuthReady } = useAuth();
  const { household, isHouseholdReady, contextMode } = useHousehold();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [impactHistory, setImpactHistory] = useState([]);
  const [useLocalData, setUseLocalData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uiModal, setUiModal] = useState(null);
  const syncInProgressRef = useRef(false);
  const localModeActivatedThisSessionRef = useRef(false);
  const localModeKey = useMemo(() => {
    const userKey = currentUser?.uid ? String(currentUser.uid) : "guest";
    const scopeKey = household?.id ? `household:${household.id}` : "personal";
    return `${STORAGE_KEYS.mode}:${userKey}:${scopeKey}`;
  }, [currentUser?.uid, household?.id]);

  const clearUiModal = () => setUiModal(null);

  const notifyFallback = useCallback((message) => {
    const safeMessage = String(message || "Action saved locally.");
    setUiModal({ title: "Cloud Sync Notice", message: safeMessage });
  }, []);

  const enableLocalData = useCallback(() => {
    setUseLocalData(true);
    localModeActivatedThisSessionRef.current = true;
    localStorage.setItem(localModeKey, "true");
    localStorage.removeItem(STORAGE_KEYS.mode);
  }, [localModeKey]);

  const disableLocalData = useCallback(() => {
    setUseLocalData(false);
    localModeActivatedThisSessionRef.current = false;
    localStorage.removeItem(localModeKey);
    localStorage.removeItem(STORAGE_KEYS.mode);
  }, [localModeKey]);

  const activeHouseholdId = household?.id || currentUser?.householdId || null;
  const activeOwnerId = currentUser?.uid || null;
  const isHouseholdMode = Boolean(activeHouseholdId);
  const activeScopeField = activeHouseholdId ? "householdId" : "ownerId";
  const activeScopeId = activeHouseholdId || activeOwnerId;
  const scopedHouseholdId = activeHouseholdId || null;

  const membershipHouseholdId =
  currentUser?.householdId ||
  household?.id ||
  null;

 const applyScopeFields = useCallback((payload = {}) => {
  const uid = currentUser?.uid;
  if (!uid) {
    throw new Error("SCOPE_NOT_READY: uid is missing at write time");
  }
  const resolvedHouseholdId =
    household?.id ||
    currentUser?.householdId ||
    null;
  return {
    ...payload,
    ownerId: uid,
    householdId: resolvedHouseholdId,
  };
}, [currentUser?.uid, currentUser?.householdId, household?.id]);



  const addScopeFields = useCallback((payload = {}) => ({
    ...payload,
    ownerId: currentUser?.uid || null,
    householdId: activeHouseholdId || payload.householdId || null,
  }), [activeHouseholdId, currentUser?.uid]);

  const ensureActiveScope = () => {
    if (!currentUser?.uid) {
      notifyFallback("Sign in before saving data.");
      return false;
    }
    if (currentUser?.householdId && !isHouseholdReady) {
      notifyFallback("Please wait while your household data loads.");
      return false;
    }
    if (!activeScopeId) {
      notifyFallback(
        isHouseholdMode
          ? "Join or create a household before saving shared data."
          : "Sign in before saving individual data."
      );
      return false;
    }
    return true;
  };

  const emitScopeEvent = async ({ eventType, message }) => {
    if (!currentUser?.uid || !activeHouseholdId || !isHouseholdMode) return;

    try {
      await addDoc(collection(db, "householdEvents"), {
        eventType,
        message,
        actorId: currentUser.uid,
        actorName: currentUser.fullName || currentUser.email || "Member",
        ownerId: currentUser.uid,
        householdId: activeHouseholdId,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Event publishing should never block core data actions.
    }
  };

  const updateLifetimeStats = async ({ moneySaved = 0, foodSavedKg = 0 }) => {
    if (!currentUser?.uid) return;

    const safeMoney = Number.isFinite(moneySaved) ? Number(moneySaved.toFixed(2)) : 0;
    const safeFood = Number.isFinite(foodSavedKg) ? Number(foodSavedKg.toFixed(4)) : 0;

    if (safeMoney <= 0 && safeFood <= 0) return;

    try {
      await setDoc(
        doc(db, "users", currentUser.uid, "stats", "summary"),
        {
          lifetimeSavings: increment(safeMoney),
          totalFoodSavedKg: increment(safeFood),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {
      // Stats are best-effort and should not block user actions.
    }
  };

  const syncLocalDataToFirebase = useCallback(async () => {
    if (!currentUser?.uid || !activeScopeId || syncInProgressRef.current) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;

    syncInProgressRef.current = true;
    try {
      const localInventory = readLocalArray(STORAGE_KEYS.inventory);
      const localShopping = readLocalArray(STORAGE_KEYS.shopping);
      const localImpact = readLocalArray(STORAGE_KEYS.impact);

      if (localInventory.length === 0 && localShopping.length === 0 && localImpact.length === 0) {
        disableLocalData();
        return false;
      }

      const writeCollection = async (collectionName, items) => {
        const BATCH_LIMIT = 450;
        for (let i = 0; i < items.length; i += BATCH_LIMIT) {
          const chunk = items.slice(i, i + BATCH_LIMIT);
          const batch = writeBatch(db);
          chunk.forEach((item) => {
            const id = item?.id || createLocalId();
            const { id: _id, ...rest } = item || {};
            batch.set(
              doc(db, collectionName, id),
              addScopeFields(rest),
              { merge: true }
            );
          });
          await batch.commit();
        }
      };

      if (localInventory.length > 0) {
        await writeCollection("inventory", localInventory);
      }

      if (localShopping.length > 0) {
        await writeCollection("shopping", localShopping);
      }

      if (localImpact.length > 0) {
        await writeCollection("impact", localImpact);
      }

      localStorage.removeItem(STORAGE_KEYS.inventory);
      localStorage.removeItem(STORAGE_KEYS.shopping);
      localStorage.removeItem(STORAGE_KEYS.impact);
      disableLocalData();
      showSuccess("Connection restored. Data synced successfully.");
      return true;
    } catch (error) {
      console.error("useDataStore: failed to sync local data.", error);
      notifyFallback(`Sync failed. Local data preserved. ${normalizeError(error)}`);
      return false;
    } finally {
      syncInProgressRef.current = false;
    }
  }, [activeScopeId, addScopeFields, currentUser?.uid, disableLocalData, notifyFallback]);

  useEffect(() => {
    if (!useLocalData) return undefined;

    const handleOnline = () => {
      syncLocalDataToFirebase();
    };

    window.addEventListener("online", handleOnline);
    if (
      localModeActivatedThisSessionRef.current &&
      typeof navigator !== "undefined" &&
      navigator.onLine
    ) {
      syncLocalDataToFirebase();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [syncLocalDataToFirebase, useLocalData]);

  const addShoppingItemLocal = (payload) => {
    setShoppingItems((prev) => {
      const next = [...prev, { ...payload, checked: false, id: createLocalId() }];
      writeLocal(STORAGE_KEYS.shopping, next);
      return next;
    });
  };

  const deleteShoppingItemsLocal = (ids) => {
    const idSet = new Set(Array.isArray(ids) ? ids.filter(Boolean) : []);
    if (idSet.size === 0) return;

    setShoppingItems((prev) => {
      const next = prev.filter((item) => !idSet.has(item.id));
      writeLocal(STORAGE_KEYS.shopping, next);
      return next;
    });
  };

  const updateShoppingItemLocal = (id, changes) => {
    setShoppingItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...changes } : item));
      writeLocal(STORAGE_KEYS.shopping, next);
      return next;
    });
  };

  useFirestoreListeners({
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
  });

  useScopeRepair({ currentUser, household, useLocalData });

  const handleSaveFood = async (data) => {
    if (!useLocalData && !ensureActiveScope()) return;

    const existingItem = data?.id
      ? inventoryItems.find((item) => item.id === data.id) || null
      : null;
    const normalizedProduct = normalizeProductForStorage(data, existingItem);

    try {
      const validation = validateInventoryItem(normalizedProduct);
      if (!validation?.isValid) {
        notifyFallback(validation?.error || "Invalid item data. Please check and try again.");
        return;
      }
    } catch {
      notifyFallback("Invalid item data. Please check and try again.");
      return;
    }

    if (useLocalData) {
      const now = new Date().toISOString();
      setInventoryItems((prev) => {
        let next;
        if (normalizedProduct.id) {
          next = prev.map((item) =>
            item.id === normalizedProduct.id ? { ...item, ...normalizedProduct } : item
          );
        } else {
          next = [{ ...normalizedProduct, id: createLocalId(), createdAt: now }, ...prev];
        }
        writeLocal(STORAGE_KEYS.inventory, next);
        return next;
      });
      return;
    }

    try {
      if (normalizedProduct.id) {
        const { id, ...rest } = normalizedProduct;
        await updateScopedDoc({
          db,
          collectionName: "inventory",
          id,
          householdId: scopedHouseholdId,
          ownerId: currentUser?.uid || null,
          scopeField: activeScopeField,
          scopeValue: activeScopeId,
          changes: rest,
        });
      } else {
        const scopedProduct = applyScopeFields(normalizedProduct);
        await addDoc(collection(db, "inventory"), {
          ...scopedProduct,
          createdAt: new Date().toISOString(),
        });
        await emitScopeEvent({
          eventType: "inventory_added",
          message: t("events.addedItem", {
            actor: currentUser?.fullName || "A member",
            item: normalizedProduct.name || "an item",
          }),
        });
      }
    } catch (error) {
      // SCOPE_NOT_READY means currentUser/household had not finished settling at
      const isScopeNotReady = error?.message?.startsWith("SCOPE_NOT_READY");

      enableLocalData();
      const fallbackItem = normalizedProduct.id
        ? normalizedProduct
        : { ...normalizedProduct, id: createLocalId(), createdAt: new Date().toISOString() };
      setInventoryItems((prev) => {
        const next = normalizedProduct.id
          ? prev.map((item) =>
            item.id === normalizedProduct.id ? { ...item, ...normalizedProduct } : item
          )
          : [fallbackItem, ...prev];
        writeLocal(STORAGE_KEYS.inventory, next);
        return next;
      });
      notifyFallback(
        isScopeNotReady
          ? "Your session is still loading. Saved locally — it will sync automatically once you're connected."
          : `Cloud save failed. Saved locally instead. ${normalizeError(error)}`
      );
    }
  };

  const handleActionFood = async (id, type) => {
    if (!useLocalData && !ensureActiveScope()) return;

    const item = inventoryItems.find((i) => i.id === id);
    if (!item) return;

    try {
      await archiveInventoryActionTransaction({
        db,
        item,
        itemId: id,
        status: type,
        fallbackIdFactory: createLocalId,
        useLocalData,
        setInventoryItems,
        setImpactHistory,
        writeLocal,
        storageKeys: STORAGE_KEYS,
        inventoryItems,
        impactHistory,
        householdId: membershipHouseholdId,
        ownerId: currentUser?.uid || null,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
      });

      const normalizedStatus = String(type || "").toLowerCase();
      const isSaved = ["eaten", "saved", "consumed"].includes(normalizedStatus);
      if (isSaved) {
        const qty = Number(item?.quantity) || 0;
        const unit = item?.unit || "unit";
        const base = toBaseUnit(qty, unit);
        const unitPrice = estimateUnitPrice(item);
        const moneySaved = Number((unitPrice * qty).toFixed(2));
        const foodSavedKg = base?.unit === "kg" ? base.quantity : base?.unit === "l" ? base.quantity : 0;

        await updateLifetimeStats({ moneySaved, foodSavedKg });
      }
      await emitScopeEvent({
        eventType: "inventory_action",
        message: t("events.inventoryAction", {
          actor: currentUser?.fullName || "A member",
          item: item?.name || "an item",
          type,
        }),
      });
    } catch (error) {
      enableLocalData();
      const impactEntry = { ...item, actionDate: new Date().toISOString(), status: type, id: createLocalId() };
      const nextInv = inventoryItems.filter((inv) => inv.id !== id);
      const nextImpact = [impactEntry, ...impactHistory];
      setInventoryItems(nextInv);
      setImpactHistory(nextImpact);
      writeLocal(STORAGE_KEYS.inventory, nextInv);
      writeLocal(STORAGE_KEYS.impact, nextImpact);
      notifyFallback(`Cloud sync failed. Action saved locally instead. ${normalizeError(error)}`);
    }
  };

  const handleDeleteFoodWithoutImpact = async (id) => {
    if (!useLocalData && !ensureActiveScope()) return;

    const item = inventoryItems.find((i) => i.id === id);
    if (!item) return;

    if (useLocalData) {
      const nextInv = inventoryItems.filter((inv) => inv.id !== id);
      setInventoryItems(nextInv);
      writeLocal(STORAGE_KEYS.inventory, nextInv);
      return;
    }

    try {
      await deleteScopedDoc({
        db,
        collectionName: "inventory",
        id,
        householdId: scopedHouseholdId,
        ownerId: currentUser?.uid || null,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
      });
    } catch (error) {
      enableLocalData();
      const nextInv = inventoryItems.filter((inv) => inv.id !== id);
      setInventoryItems(nextInv);
      writeLocal(STORAGE_KEYS.inventory, nextInv);
      notifyFallback(`Cloud sync failed. Item removed locally instead. ${normalizeError(error)}`);
    }
  };

  const handlePurchase = async (checkedItems) => {
    if (!Array.isArray(checkedItems) || checkedItems.length === 0) return false;
    if (!useLocalData && !ensureActiveScope()) return false;

    if (useLocalData) {
      const purchasedIds = new Set(checkedItems.map((item) => item.id));

      const { nextInventory, mergedCount, newBatchCount } =
        mergePurchasedIntoInventoryLocal(inventoryItems, checkedItems);
      const nextShopping = shoppingItems.filter((item) => !purchasedIds.has(item.id));

      setInventoryItems(nextInventory);
      setShoppingItems(nextShopping);
      writeLocal(STORAGE_KEYS.inventory, nextInventory);
      writeLocal(STORAGE_KEYS.shopping, nextShopping);
      return {
        success: true,
        movedCount: checkedItems.length,
        skippedCount: 0,
        skippedIds: [],
        mergedCount,
        newBatchCount,
      };
    }

    try {
      const result = await moveShoppingToInventoryTransaction({
        db,
        shoppingItems: checkedItems,
        existingInventoryItems: inventoryItems,
        ownerId: currentUser?.uid,
        householdId: membershipHouseholdId,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
        categoryIcons,
        buildInventoryFinancialFields,
      });
      await emitScopeEvent({
        eventType: "shopping_checkout",
        message: t("events.completedShopping", {
          actor: currentUser?.fullName || "A member",
          count: result?.movedCount || checkedItems.length,
        }),
      });
      return {
        success: (result?.movedCount || 0) > 0,
        movedCount: result?.movedCount || 0,
        skippedCount: result?.skippedCount || 0,
        skippedIds: result?.skippedIds || [],
        mergedCount: result?.mergedCount || 0,
        newBatchCount: result?.newBatchCount || 0,
      };
    } catch {
      notifyFallback("Transfer failed, check your connection.");
      return false;
    }
  };

  const handleCookRecipe = async (usedInventory) => {
    if (!Array.isArray(usedInventory) || usedInventory.length === 0) return;
    if (!useLocalData && !ensureActiveScope()) return;

    if (useLocalData) {
      const next = applyUsageToInventory(inventoryItems, usedInventory);
      setInventoryItems(next);
      writeLocal(STORAGE_KEYS.inventory, next);
      const stats = calculateCookStats(usedInventory, inventoryItems);
      await updateLifetimeStats(stats);
      return;
    }

    try {
      const next = applyUsageToInventory(inventoryItems, usedInventory);
      await applyInventoryUsageWrites({
        db,
        inventoryItems,
        nextItems: next,
        householdId: scopedHouseholdId,
        ownerId: currentUser?.uid || null,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
      });

      const stats = calculateCookStats(usedInventory, inventoryItems);
      await updateLifetimeStats(stats);
    } catch (error) {
      enableLocalData();
      const next = applyUsageToInventory(inventoryItems, usedInventory);
      setInventoryItems(next);
      writeLocal(STORAGE_KEYS.inventory, next);
      notifyFallback(`Cloud sync failed. Cooking update saved locally instead. ${normalizeError(error)}`);
    }
  };

  const handleAddShoppingFromRecipes = async (item) => {
    if (!useLocalData && !ensureActiveScope()) return { merged: false, blocked: true };

    const payload = {
      ...item,
      quantity: toSafeQuantity(item?.quantity),
      estimatedPrice: toSafePrice(item?.estimatedPrice),
      sourceType: item.sourceType || "recipe-missing",
    };

    try {
      const validation = validateInventoryItem(payload);
      if (!validation?.isValid) {
        notifyFallback(validation?.error || "Invalid shopping item. Please check and try again.");
        return { merged: false, blocked: true };
      }
    } catch {
      notifyFallback("Invalid shopping item. Please check and try again.");
      return { merged: false, blocked: true };
    }

    const duplicateAcrossLists = buildCrossListDuplicateGuard({
      name: payload?.name,
      shoppingItems,
      inventoryItems,
    });

    if (duplicateAcrossLists.isDuplicate && duplicateAcrossLists.source === "inventory") {
      return { merged: false, blocked: true, source: "inventory", id: duplicateAcrossLists.matchedItem?.id };
    }

    const duplicate = findShoppingDuplicate(shoppingItems, payload);

    if (duplicate) {
      const mergeChanges = buildMergedShoppingChanges(duplicate, payload);

      if (useLocalData) {
        updateShoppingItemLocal(duplicate.id, mergeChanges);
        return { merged: true, id: duplicate.id };
      }

      try {
        await updateScopedDoc({
          db,
          collectionName: "shopping",
          id: duplicate.id,
          householdId: scopedHouseholdId,
          ownerId: currentUser?.uid || null,
          scopeField: activeScopeField,
          scopeValue: activeScopeId,
          changes: mergeChanges,
        });
        return { merged: true, id: duplicate.id };
      } catch (error) {
        enableLocalData();
        updateShoppingItemLocal(duplicate.id, mergeChanges);
        notifyFallback(`Cloud save failed. Item merged locally instead. ${normalizeError(error)}`);
        return { merged: true, id: duplicate.id };
      }
    }

    if (useLocalData) {
      addShoppingItemLocal(payload);
      return { merged: false };
    }

    try {
      const scopedPayload = applyScopeFields(payload);
      await addDoc(collection(db, "shopping"), {
        ...scopedPayload,
        checked: false,
      });
      await emitScopeEvent({
        eventType: "shopping_added",
        message: t("events.addedToShopping", {
          actor: currentUser?.fullName || "A member",
          item: payload?.name || "an item",
        }),
      });
      return { merged: false };
    } catch (error) {
      if (error?.message?.startsWith("SCOPE_NOT_READY")) {
        notifyFallback("Your session is still loading. Please wait a moment and try again.");
        return { merged: false, blocked: true };
      }
      enableLocalData();
      addShoppingItemLocal(payload);
      notifyFallback(`Cloud save failed. Item saved locally instead. ${normalizeError(error)}`);
      return { merged: false };
    }
  };

  const handleAddShoppingItem = async (item, { bypassInventoryCheck = false } = {}) => {
    if (!useLocalData && !ensureActiveScope()) return { merged: false, blocked: true };

    const payload = {
      ...item,
      quantity: toSafeQuantity(item?.quantity),
      estimatedPrice: toSafePrice(item?.estimatedPrice),
      sourceType: item.sourceType || "manual",
    };

    try {
      const validation = validateInventoryItem(payload);
      if (!validation?.isValid) {
        notifyFallback(validation?.error || "Invalid shopping item. Please check and try again.");
        return { merged: false, blocked: true };
      }
    } catch {
      notifyFallback("Invalid shopping item. Please check and try again.");
      return { merged: false, blocked: true };
    }

    const duplicateAcrossLists = buildCrossListDuplicateGuard({
      name: payload?.name,
      shoppingItems,
      inventoryItems: bypassInventoryCheck ? [] : inventoryItems,
      excludeShoppingItemId: item?.id || null,
    });

    if (!bypassInventoryCheck && duplicateAcrossLists.isDuplicate && duplicateAcrossLists.source === "inventory") {
      return { merged: false, blocked: true, source: "inventory", id: duplicateAcrossLists.matchedItem?.id };
    }

    const duplicate = findShoppingDuplicate(shoppingItems, payload);

    if (duplicate) {
      const mergeChanges = buildMergedShoppingChanges(duplicate, payload);

      if (useLocalData) {
        updateShoppingItemLocal(duplicate.id, mergeChanges);
        return { merged: true, id: duplicate.id };
      }

      try {
        await updateScopedDoc({
          db,
          collectionName: "shopping",
          id: duplicate.id,
          householdId: scopedHouseholdId,
          ownerId: currentUser?.uid || null,
          scopeField: activeScopeField,
          scopeValue: activeScopeId,
          changes: mergeChanges,
        });
        return { merged: true, id: duplicate.id };
      } catch (error) {
        enableLocalData();
        updateShoppingItemLocal(duplicate.id, mergeChanges);
        notifyFallback(`Cloud save failed. Item merged locally instead. ${normalizeError(error)}`);
        return { merged: true, id: duplicate.id };
      }
    }

    if (useLocalData) {
      addShoppingItemLocal(payload);
      return { merged: false };
    }

    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let scopedPayload;
    try {
      scopedPayload = applyScopeFields(payload);
    } catch (error) {
      if (error?.message?.startsWith("SCOPE_NOT_READY")) {
        enableLocalData();
        addShoppingItemLocal(payload);
        notifyFallback("Your session is still loading. Saved locally — it will sync automatically once you're connected.");
        return { merged: false };
      }
      throw error;
    }

    const optimisticItem = { ...scopedPayload, checked: false, id: optimisticId };

    setShoppingItems((prev) => {
      const next = [...prev, optimisticItem];
      writeLocal(STORAGE_KEYS.shopping, next);
      return next;
    });

    try {
      await addDoc(collection(db, "shopping"), {
        ...scopedPayload,
        checked: false,
      });
      await emitScopeEvent({
        eventType: "shopping_added",
        message: t("events.addedToShopping", {
          actor: currentUser?.fullName || "A member",
          item: payload?.name || "an item",
        }),
      });
      return { merged: false };
    } catch (error) {
      if (error?.message?.startsWith("SCOPE_NOT_READY")) {
        setShoppingItems((prev) => prev.filter((item) => item.id !== optimisticId));
        notifyFallback("Your session is still loading. Please wait a moment and try again.");
        return { merged: false, blocked: true };
      }
      setShoppingItems((prev) => prev.filter((item) => item.id !== optimisticId));
      enableLocalData();
      addShoppingItemLocal(payload);
      notifyFallback(`Cloud save failed. Item saved locally instead. ${normalizeError(error)}`);
      return { merged: false };
    }
  };

  const handleToggleShoppingItem = async (id, checked) => {
    if (!useLocalData && !ensureActiveScope()) return;

    const changes = { checked: !checked };

    if (useLocalData) {
      updateShoppingItemLocal(id, changes);
      return;
    }

    try {
      await updateScopedDoc({
        db,
        collectionName: "shopping",
        id,
        householdId: scopedHouseholdId,
        ownerId: currentUser?.uid || null,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
        changes,
      });
    } catch (error) {
      enableLocalData();
      updateShoppingItemLocal(id, changes);
      notifyFallback(`Cloud sync failed. Change saved locally instead. ${normalizeError(error)}`);
    }
  };

  const handleDeleteShoppingItem = async (id) => {
    if (!useLocalData && !ensureActiveScope()) return;

    if (useLocalData) {
      deleteShoppingItemsLocal([id]);
      return;
    }

    try {
      await deleteScopedDoc({
        db,
        collectionName: "shopping",
        id,
        householdId: scopedHouseholdId,
        ownerId: currentUser?.uid || null,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
      });
    } catch (error) {
      enableLocalData();
      deleteShoppingItemsLocal([id]);
      notifyFallback(`Cloud sync failed. Item removed locally instead. ${normalizeError(error)}`);
    }
  };

  const handleDeleteShoppingItems = async (ids) => {
    const safeIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (safeIds.length === 0) return;
    if (!useLocalData && !ensureActiveScope()) return;

    if (useLocalData) {
      deleteShoppingItemsLocal(safeIds);
      return;
    }

    try {
      await batchDeleteScopedDocs({
        db,
        collectionName: "shopping",
        ids: safeIds,
        householdId: scopedHouseholdId,
        ownerId: currentUser?.uid || null,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
      });
    } catch (error) {
      enableLocalData();
      deleteShoppingItemsLocal(safeIds);
      notifyFallback(`Cloud sync failed. Items removed locally instead. ${normalizeError(error)}`);
    }
  };

  const handleUpdateShoppingItem = async (id, changes) => {
    if (!id || !changes || typeof changes !== "object") return;
    if (!useLocalData && !ensureActiveScope()) return { blocked: true };

    const nextName = String(
      changes?.name || shoppingItems.find((item) => item.id === id)?.name || ""
    ).trim();
    const duplicateAcrossLists = buildCrossListDuplicateGuard({
      name: nextName,
      shoppingItems,
      inventoryItems,
      excludeShoppingItemId: id,
    });

    if (duplicateAcrossLists.isDuplicate && duplicateAcrossLists.source === "inventory") {
      return { blocked: true, source: "inventory", id: duplicateAcrossLists.matchedItem?.id };
    }

    const maybePrice = toSafePrice(changes?.estimatedPrice);
    const itemName = nextName;
    const baseQuantity = toSafeQuantity(
      changes?.quantity ?? shoppingItems.find((item) => item.id === id)?.quantity
    );
    const baseUnit = normalizeUnit(
      changes?.unit ?? shoppingItems.find((item) => item.id === id)?.unit
    );

    if (useLocalData) {
      updateShoppingItemLocal(id, changes);
      return { blocked: false };
    }

    try {
      await updateScopedDoc({
        db,
        collectionName: "shopping",
        id,
        householdId: scopedHouseholdId,
        ownerId: currentUser?.uid || null,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
        changes,
      });

      if (maybePrice !== null && itemName) {
        try {
          const normalized = toBaseUnit(baseQuantity, baseUnit);
          const safeQty = normalized?.quantity || 1;
          const pricePerUnit = Number((maybePrice / safeQty).toFixed(4));

          await addDoc(collection(db, "priceHistory"), {
            name: itemName,
            price: maybePrice,
            source: "shopping-edit",
            ownerId: currentUser?.uid || null,
            householdId: membershipHouseholdId,
            createdAt: new Date().toISOString(),
            quantity: safeQty,
            unit: normalized?.unit || baseUnit || "unit",
            pricePerUnit,
          });
        } catch {
          // Price history best-effort write should not block item edits.
        }
      }
      return { blocked: false };
    } catch (error) {
      enableLocalData();
      updateShoppingItemLocal(id, changes);
      notifyFallback(`Cloud sync failed. Update saved locally instead. ${normalizeError(error)}`);
      return { blocked: false };
    }
  };

  const handleBatchUpdateShoppingItems = async (updatesOrIds, changes) => {
    let updates = [];

    if (Array.isArray(updatesOrIds)) {
      const isUpdateObjects = updatesOrIds.every(
        (entry) => entry && typeof entry === "object" && "id" in entry && "changes" in entry
      );

      if (isUpdateObjects) {
        updates = updatesOrIds;
      } else {
        const safeIds = updatesOrIds.filter((id) => id);
        if (safeIds.length === 0 || !changes || typeof changes !== "object") return;
        updates = safeIds.map((id) => ({ id, changes }));
      }
    }

    const safeUpdates = updates
      .filter(
        (update) =>
          update && typeof update === "object" && update.id && update.changes && typeof update.changes === "object"
      )
      .map((update) => ({ id: String(update.id), changes: update.changes }));

    if (safeUpdates.length === 0) return;
    if (!useLocalData && !ensureActiveScope()) return;

    const scopedUpdates = safeUpdates.filter(({ id }) =>
      shoppingItems.some((entry) => entry.id === id)
    );

    if (scopedUpdates.length === 0) return;

    if (useLocalData) {
      setShoppingItems((prev) => {
        const next = prev.map((item) => {
          const update = scopedUpdates.find((entry) => entry.id === item.id);
          return update ? { ...item, ...update.changes } : item;
        });
        writeLocal(STORAGE_KEYS.shopping, next);
        return next;
      });
      return;
    }

    try {
      await batchUpdateScopedDocs({
        db,
        collectionName: "shopping",
        updates: scopedUpdates,
        householdId: scopedHouseholdId,
        ownerId: currentUser?.uid || null,
        scopeField: activeScopeField,
        scopeValue: activeScopeId,
      });
    } catch (error) {
      enableLocalData();
      setShoppingItems((prev) => {
        const next = prev.map((item) => {
          const update = scopedUpdates.find((entry) => entry.id === item.id);
          return update ? { ...item, ...update.changes } : item;
        });
        writeLocal(STORAGE_KEYS.shopping, next);
        return next;
      });
      notifyFallback(`Cloud sync failed. Items updated locally instead. ${normalizeError(error)}`);
    }
  };

  const scopeUid = currentUser?.uid || null;
  const scopeHouseholdId = household?.id || null;
  const scopedInventoryItems = useMemo(
    () => filterByScope(inventoryItems, { contextMode, uid: scopeUid, householdId: scopeHouseholdId }),
    [inventoryItems, contextMode, scopeUid, scopeHouseholdId],
  );
  const scopedShoppingItems = useMemo(
    () => filterByScope(shoppingItems, { contextMode, uid: scopeUid, householdId: scopeHouseholdId }),
    [shoppingItems, contextMode, scopeUid, scopeHouseholdId],
  );
  const scopedImpactHistory = useMemo(
    () => filterByScope(impactHistory, { contextMode, uid: scopeUid, householdId: scopeHouseholdId }),
    [impactHistory, contextMode, scopeUid, scopeHouseholdId],
  );

  return {
    inventoryItems: scopedInventoryItems,
    shoppingItems: scopedShoppingItems,
    impactHistory: scopedImpactHistory,
    isLoading,
    uiModal,
    clearUiModal,
    handleSaveFood,
    handleActionFood,
    handleDeleteFoodWithoutImpact,
    handlePurchase,
    handleCookRecipe,
    handleAddShoppingFromRecipes,
    handleAddShoppingItem,
    handleToggleShoppingItem,
    handleDeleteShoppingItem,
    handleDeleteShoppingItems,
    handleBatchUpdateShoppingItems,
    handleUpdateShoppingItem,
  };
};

export const DataStoreProvider = ({ children }) => {
  const store = useDataStoreState();
  return <DataStoreContext.Provider value={store}>{children}</DataStoreContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error("useDataStore must be used inside DataStoreProvider");
  }
  return context;
};

