import { collection, doc, runTransaction } from "firebase/firestore";

const DEFAULT_ICON = "box";
const normalizeNameKey = (value) => String(value || "").trim().toLowerCase();
const normalizeUnitKey = (value) => String(value || "").trim().toLowerCase();
const normalizeExpiryKey = (value) => String(value || "").trim();

const buildBatchKey = (name, expiry) =>
  `${normalizeNameKey(name)}|${normalizeExpiryKey(expiry)}`;

const convertQuantityToUnit = (amount, fromUnit, toUnit) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;

  const from = normalizeUnitKey(fromUnit);
  const to = normalizeUnitKey(toUnit);
  if (!from || !to || from === to) return value;

  const massUnits = { g: 1, kg: 1000 };
  const volumeUnits = { ml: 1, l: 1000 };

  if (massUnits[from] && massUnits[to]) {
    return Number(((value * massUnits[from]) / massUnits[to]).toFixed(4));
  }
  if (volumeUnits[from] && volumeUnits[to]) {
    return Number(((value * volumeUnits[from]) / volumeUnits[to]).toFixed(4));
  }

  return value;
};

const buildScope = ({ scopeField, scopeValue, householdId, ownerId } = {}) => {
  const field = scopeField || (ownerId ? "ownerId" : "householdId");
  const value = scopeValue || (field === "ownerId" ? ownerId : householdId);

  return {
    field,
    value,
    ownerId: ownerId || (field === "ownerId" ? value : null),
    householdId: householdId || (field === "householdId" ? value : null),
  };
};

const assertScopeMatch = (data, scope) => {
  if (!scope?.field || !scope?.value) {
    throw new Error("DATA_SCOPE_REQUIRED");
  }

  const ownerMatches =
    scope.ownerId && String(data?.ownerId || "") === String(scope.ownerId);
  const householdMatches =
    scope.householdId && String(data?.householdId || "") === String(scope.householdId);

  if (!ownerMatches && !householdMatches) {
    throw new Error("DATA_SCOPE_MISMATCH");
  }
};

export const updateScopedDoc = async ({ db, collectionName, id, householdId, ownerId, scopeField, scopeValue, changes }) => {
  if (!collectionName || !id || !changes || typeof changes !== "object") {
    throw new Error("INVALID_SCOPED_UPDATE");
  }

  const scope = buildScope({ scopeField, scopeValue, householdId, ownerId });

  return await runTransaction(db, async (transaction) => {
    const ref = doc(db, collectionName, id);
    const snap = await transaction.get(ref);

    if (!snap.exists()) {
      throw new Error("DOCUMENT_NOT_FOUND");
    }

    assertScopeMatch(snap.data(), scope);
    transaction.update(ref, { ...changes, [scope.field]: scope.value });
  });
};

export const deleteScopedDoc = async ({ db, collectionName, id, householdId, ownerId, scopeField, scopeValue }) => {
  if (!collectionName || !id) {
    throw new Error("INVALID_SCOPED_DELETE");
  }

  const scope = buildScope({ scopeField, scopeValue, householdId, ownerId });

  return await runTransaction(db, async (transaction) => {
    const ref = doc(db, collectionName, id);
    const snap = await transaction.get(ref);

    if (!snap.exists()) {
      return;
    }

    assertScopeMatch(snap.data(), scope);
    transaction.delete(ref);
  });
};


const SCOPED_TRANSACTION_LIMIT = 450;

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
};

/**
 * Update many documents in a collection, verifying each is in scope before
 * writing. Mirrors updateScopedDoc: a missing document is skipped, an
 * out-of-scope document aborts its chunk's transaction (DATA_SCOPE_MISMATCH),
 * and the active scope field/value is re-stamped on every write.
 *
 * @param {Array<{id: string, changes: object}>} updates
 */
export const batchUpdateScopedDocs = async ({ db, collectionName, updates, householdId, ownerId, scopeField, scopeValue }) => {
  if (!collectionName) {
    throw new Error("INVALID_SCOPED_UPDATE");
  }

  const scope = buildScope({ scopeField, scopeValue, householdId, ownerId });

  const safeUpdates = (Array.isArray(updates) ? updates : []).filter(
    (entry) => entry && entry.id && entry.changes && typeof entry.changes === "object"
  );
  if (safeUpdates.length === 0) return;

  for (const group of chunk(safeUpdates, SCOPED_TRANSACTION_LIMIT)) {
    await runTransaction(db, async (transaction) => {
      const verified = [];

      for (const { id, changes } of group) {
        const ref = doc(db, collectionName, id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) continue;
        assertScopeMatch(snap.data(), scope);
        verified.push({ ref, changes });
      }

      for (const { ref, changes } of verified) {
        transaction.update(ref, { ...changes, [scope.field]: scope.value });
      }
    });
  }
};

/**
 * Delete many documents in a collection, verifying each is in scope first.
 * Mirrors deleteScopedDoc: missing documents are skipped; an out-of-scope
 * document aborts its chunk's transaction.
 *
 * @param {string[]} ids
 */
export const batchDeleteScopedDocs = async ({ db, collectionName, ids, householdId, ownerId, scopeField, scopeValue }) => {
  if (!collectionName) {
    throw new Error("INVALID_SCOPED_DELETE");
  }

  const scope = buildScope({ scopeField, scopeValue, householdId, ownerId });

  const safeIds = (Array.isArray(ids) ? ids : []).filter(Boolean).map(String);
  if (safeIds.length === 0) return;

  for (const group of chunk(safeIds, SCOPED_TRANSACTION_LIMIT)) {
    await runTransaction(db, async (transaction) => {
      const verified = [];

      for (const id of group) {
        const ref = doc(db, collectionName, id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) continue;
        assertScopeMatch(snap.data(), scope);
        verified.push(ref);
      }

      for (const ref of verified) {
        transaction.delete(ref);
      }
    });
  }
};

export const archiveInventoryActionTransaction = async ({
  db,
  inventoryCollection = "inventory",
  impactCollection = "impact",
  item,
  itemId,
  status,
  fallbackIdFactory,
  useLocalData,
  setInventoryItems,
  setImpactHistory,
  writeLocal,
  storageKeys,
  inventoryItems,
  impactHistory,
  householdId,
  ownerId,
  scopeField,
  scopeValue,
}) => {
  const nowIso = new Date().toISOString();
  const scope = buildScope({ scopeField, scopeValue, householdId, ownerId });

  if (useLocalData) {
    const impactEntry = { ...item, householdId, actionDate: nowIso, status, id: fallbackIdFactory() };
    const nextInv = inventoryItems.filter((inv) => inv.id !== itemId);
    const nextImpact = [impactEntry, ...impactHistory];
    setInventoryItems(nextInv);
    setImpactHistory(nextImpact);
    writeLocal(storageKeys.inventory, nextInv);
    writeLocal(storageKeys.impact, nextImpact);
    return;
  }

  await runTransaction(db, async (transaction) => {
    const inventoryRef = doc(db, inventoryCollection, itemId);
    const inventorySnap = await transaction.get(inventoryRef);

    if (!inventorySnap.exists()) {
      throw new Error("INVENTORY_ITEM_NOT_FOUND");
    }

    assertScopeMatch(inventorySnap.data(), scope);

    const impactRef = doc(collection(db, impactCollection));
    transaction.set(impactRef, {
      ...inventorySnap.data(),
      householdId,
      ownerId: ownerId || inventorySnap.data()?.ownerId || null,
      actionDate: nowIso,
      status,
    });
    transaction.delete(inventoryRef);
  });
};

export const moveShoppingToInventoryTransaction = async ({
  db,
  shoppingItems,
  existingInventoryItems = [],
  ownerId,
  householdId,
  scopeField,
  scopeValue,
  categoryIcons,
  buildInventoryFinancialFields,
  inventoryCollection = "inventory",
  shoppingCollection = "shopping",
}) => {
  const scope = buildScope({ scopeField, scopeValue, householdId, ownerId });
  if (!scope.value) throw new Error("DATA_SCOPE_REQUIRED");

  const inventoryTargets = new Map();
  existingInventoryItems.forEach((item) => {
    if (!item?.id || !normalizeNameKey(item?.name)) return;
    if (String(item?.[scope.field] || "") !== String(scope.value)) return;
    const key = buildBatchKey(item?.name, item?.expiry ?? item?.expiryDate);
    if (!inventoryTargets.has(key)) {
      inventoryTargets.set(key, item);
    }
  });

  await runTransaction(db, async (transaction) => {
    const verifiedShoppingWrites = [];
    const missingShoppingIds = [];

    for (const item of shoppingItems) {
      if (!item?.id) {
        continue;
      }

      const shoppingRef = doc(db, shoppingCollection, item.id);
      const shoppingSnap = await transaction.get(shoppingRef);

      if (!shoppingSnap.exists()) {
        missingShoppingIds.push(item.id);
        continue;
      }

      assertScopeMatch(shoppingSnap.data(), scope);
      verifiedShoppingWrites.push({ item, shoppingRef });
    }

    if (verifiedShoppingWrites.length === 0) {
      return { movedCount: 0, skippedCount: missingShoppingIds.length, skippedIds: missingShoppingIds };
    }

    const accumulatedUpdates = new Map();
    let mergedCount = 0;
    let newBatchCount = 0;

    for (const { item, shoppingRef } of verifiedShoppingWrites) {
      const financial = buildInventoryFinancialFields(item);
      const batchKey = buildBatchKey(item?.name, item?.expiry);
      const existingInventory = inventoryTargets.get(batchKey) || null;

      transaction.delete(shoppingRef);

      if (existingInventory?.id) {
        mergedCount += 1;
        const rawAddedQty = Number(financial.quantity) || 0;
        const addedQty =
          Number(
            convertQuantityToUnit(rawAddedQty, item?.unit, existingInventory?.unit),
          ) || 0;
        const addedPrice = Number(financial.price) || 0;

        const prev = accumulatedUpdates.get(batchKey) || {
          quantity: Number(existingInventory.quantity) || 0,
          price: Number(existingInventory.price) || 0,
          initialQuantity: Number(existingInventory.initialQuantity) || Number(existingInventory.quantity) || 0,
          initialInvestment: Number(existingInventory.initialInvestment) || Number(existingInventory.price) || 0,
          investedValueLeft: Number(existingInventory.investedValueLeft) || Number(existingInventory.price) || 0,
          id: existingInventory.id,
          ownerId: existingInventory.ownerId,
        };

        const mergedQuantity = Number((prev.quantity + addedQty).toFixed(2));
        const mergedPrice = Number((prev.price + addedPrice).toFixed(2));
        const mergedUnitPrice = mergedQuantity > 0 ? Number((mergedPrice / mergedQuantity).toFixed(4)) : 0;

        accumulatedUpdates.set(batchKey, {
          ...prev,
          quantity: mergedQuantity,
          price: mergedPrice,
          unitPrice: mergedUnitPrice,
          initialQuantity: Number((prev.initialQuantity + addedQty).toFixed(2)),
          initialInvestment: Number((prev.initialInvestment + addedPrice).toFixed(2)),
          investedValueLeft: Number((prev.investedValueLeft + addedPrice).toFixed(2)),
        });
      } else {
        newBatchCount += 1;
        const inventoryRef = doc(collection(db, inventoryCollection));
        const nowIso = new Date().toISOString();
        const expiryValue = item.expiry || null;
        transaction.set(inventoryRef, {
          name: item.name,
          category: item.category,
          icon: categoryIcons[item.category] || DEFAULT_ICON,
          ...financial,
          ownerId: ownerId || null,
          householdId,
          unit: item.unit,
          expiry: expiryValue,
          expiryDate: expiryValue,
          purchaseDate: nowIso,
          batchId: inventoryRef.id,
          createdAt: nowIso,
        });
  
        inventoryTargets.set(batchKey, {
          id: inventoryRef.id,
          name: item.name,
          unit: item.unit,
          expiry: expiryValue,
          ownerId: ownerId || null,
          quantity: Number(financial.quantity) || 0,
          price: Number(financial.price) || 0,
          initialQuantity: Number(financial.initialQuantity) || Number(financial.quantity) || 0,
          initialInvestment: Number(financial.initialInvestment) || Number(financial.price) || 0,
          investedValueLeft: Number(financial.investedValueLeft) || Number(financial.price) || 0,
        });
      }
    }

    for (const [batchKey, accumulated] of accumulatedUpdates) {
      const existingInventory = inventoryTargets.get(batchKey);
      if (!existingInventory?.id) continue;

      transaction.set(
        doc(db, inventoryCollection, existingInventory.id),
        {
          householdId,
          ownerId: ownerId || existingInventory.ownerId || null,
          quantity: accumulated.quantity,
          price: accumulated.price,
          unitPrice: accumulated.unitPrice,
          initialQuantity: accumulated.initialQuantity,
          initialInvestment: accumulated.initialInvestment,
          investedValueLeft: accumulated.investedValueLeft,
        },
        { merge: true }
      );

      inventoryTargets.set(batchKey, {
        ...existingInventory,
        householdId,
        ownerId: ownerId || existingInventory.ownerId || null,
        quantity: accumulated.quantity,
        price: accumulated.price,
        unitPrice: accumulated.unitPrice,
        initialQuantity: accumulated.initialQuantity,
        initialInvestment: accumulated.initialInvestment,
        investedValueLeft: accumulated.investedValueLeft,
      });
    }

    return {
      movedCount: verifiedShoppingWrites.length,
      skippedCount: missingShoppingIds.length,
      skippedIds: missingShoppingIds,
      mergedCount,
      newBatchCount,
    };
  });
};

export const applyInventoryUsageWrites = async ({ db, inventoryItems, nextItems, householdId, ownerId, scopeField, scopeValue }) => {
  const scope = buildScope({ scopeField, scopeValue, householdId, ownerId });
  if (!scope.value) throw new Error("DATA_SCOPE_REQUIRED");

  const oldById = new Map(inventoryItems.map((item) => [item.id, item]));
  const nextById = new Map(nextItems.map((item) => [item.id, item]));
  const writes = [];

  inventoryItems.forEach((oldItem) => {
    const updatedItem = nextById.get(oldItem.id);
    if (!updatedItem) {
      writes.push({ type: "delete", id: oldItem.id });
      return;
    }

    const oldQty = Number(oldById.get(oldItem.id)?.quantity) || 0;
    const newQty = Number(updatedItem.quantity) || 0;
    const oldInvested = Number(oldById.get(oldItem.id)?.investedValueLeft) || 0;
    const newInvested = Number(updatedItem.investedValueLeft) || 0;
    const oldConsumed = Number(oldById.get(oldItem.id)?.consumedValue) || 0;
    const newConsumed = Number(updatedItem.consumedValue) || 0;
    const oldUnitPrice = Number(oldById.get(oldItem.id)?.unitPrice) || 0;
    const newUnitPrice = Number(updatedItem.unitPrice) || 0;

    const changed =
      newQty !== oldQty ||
      newInvested !== oldInvested ||
      newConsumed !== oldConsumed ||
      newUnitPrice !== oldUnitPrice;

    if (changed) {
      writes.push({
        type: "update",
        id: oldItem.id,
        changes: {
          quantity: newQty,
          unitPrice: Number(newUnitPrice.toFixed(4)),
          investedValueLeft: Number(newInvested.toFixed(2)),
          consumedValue: Number(newConsumed.toFixed(2)),
        },
      });
    }
  });

  await runTransaction(db, async (transaction) => {
    const verifiedWrites = [];

    for (const write of writes) {
      const ref = doc(db, "inventory", write.id);
      const snap = await transaction.get(ref);

      if (!snap.exists()) {
        continue;
      }

      assertScopeMatch(snap.data(), scope);
      verifiedWrites.push({ write, ref });
    }

    for (const { write, ref } of verifiedWrites) {
      if (write.type === "delete") {
        transaction.delete(ref);
      } else {
        transaction.update(ref, { ...write.changes, [scope.field]: scope.value });
      }
    }
  });
};
