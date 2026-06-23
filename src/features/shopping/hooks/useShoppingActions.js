import { useCallback, useMemo, useState } from "react";
import { useDataStore } from "../../../hooks/useDataStore";
import { showError, showSuccess } from "../../../utils/toast";
import { checkBeforeAdding, getItemLabel } from "../utils/shoppingUtils";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function useShoppingActions({ items, inventory, resolvePrice, onSwapAccepted }) {
  const {
    handleAddShoppingItem,
    handleToggleShoppingItem,
    handleDeleteShoppingItem,
    handleDeleteShoppingItems,
    handleBatchUpdateShoppingItems,
    handleUpdateShoppingItem,
    handlePurchase,
    handleActionFood,
  } = useDataStore();

  const manualItems = useMemo(
    () => items.filter((item) => item.sourceType === "manual" || !item.sourceType),
    [items],
  );

  const isAllManualSelected = useMemo(
    () => manualItems.length > 0 && manualItems.every((item) => item.checked),
    [manualItems],
  );

  const [addModalState, setAddModalState] = useState(null);

  const openAddModal = useCallback(() => {
    setAddModalState({ name: "", price: "", qty: "1", unit: "pcs", category: "Other", editingId: null });
  }, []);

  const openEditModal = useCallback((item) => {
    setAddModalState({
      name: String(item?.name || ""),
      price: String(item?.estimatedPrice ?? ""),
      qty: String(item?.quantity || "1"),
      unit: String(item?.unit || "pcs"),
      category: String(item?.category || "Other"),
      editingId: item?.id || null,
    });
  }, []);

  const closeAddModal = useCallback(() => setAddModalState(null), []);

  const handleSaveItem = useCallback(async (fields, opts = {}) => {
    const { name, price, qty, unit, category, editingId } = fields;
    const trimmedName = String(name || "").trim();
    if (!trimmedName) { showError("Item name is required"); return false; }

    const parsedQty = Number(qty);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) { showError("Quantity must be greater than 0"); return false; }

    if (!opts.bypassInventoryCheck) {
      const duplicateCheck = checkBeforeAdding({
        name: trimmedName,
        shoppingItems: items,
        inventoryItems: inventory,
        excludeShoppingItemId: editingId,
      });

      if (duplicateCheck.isDuplicate && duplicateCheck.source === "inventory") {
        const matchedLabel = getItemLabel(duplicateCheck.matchedItem) || trimmedName;
        const matchedQty = duplicateCheck.matchedItem?.quantity ?? "";
        const matchedUnit = duplicateCheck.matchedItem?.unit ?? "";
        const warning = `"${matchedLabel}" is already in your fridge${matchedQty ? ` (${matchedQty} ${matchedUnit})` : ""}. Add to shopping list anyway?`;
        return { needsConfirm: true, warning };
      }
    }

    const parsedPrice = Number.parseFloat(price);
    const hasPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;

    try {
      if (editingId) {
        const duplicateCheck = checkBeforeAdding({
          name: trimmedName,
          shoppingItems: items,
          inventoryItems: inventory,
          excludeShoppingItemId: editingId,
        });

        if (duplicateCheck.isDuplicate && duplicateCheck.source === "shopping list") {
          const targetItem = duplicateCheck.matchedItem;
          if (!targetItem?.id) { showError("Could not merge duplicate shopping items. Please try again"); return false; }

          const targetQty = Number(targetItem.quantity);
          const mergedQuantity = (Number.isFinite(targetQty) && targetQty > 0 ? targetQty : 0) + parsedQty;
          const mergeResult = await handleUpdateShoppingItem(targetItem.id, {
            quantity: Number(mergedQuantity.toFixed(2)),
            unit, category,
            estimatedPrice: hasPrice ? parsedPrice : null,
          });
          if (mergeResult?.blocked && mergeResult?.source === "inventory") { showError("Item already exists in inventory"); return false; }
          await handleDeleteShoppingItem(editingId);
          showSuccess("Duplicate item merged into existing shopping entry");
          return true;
        }

        const updateResult = await handleUpdateShoppingItem(editingId, {
          name: trimmedName, quantity: parsedQty, unit, category,
          estimatedPrice: hasPrice ? parsedPrice : null,
        });
        if (updateResult?.blocked && updateResult?.source === "inventory") { showError("Item already exists in inventory"); return false; }
        showSuccess("Shopping item updated");
      } else {
        const result = await handleAddShoppingItem({
          name: trimmedName, quantity: parsedQty, unit, category,
          estimatedPrice: hasPrice ? parsedPrice : null,
          checked: false,
        }, { bypassInventoryCheck: Boolean(opts.bypassInventoryCheck) });
        if (result?.blocked && result?.source === "inventory") { showError("Item already exists in inventory"); return false; }
        showSuccess(result?.merged ? "Item already existed. Quantities were combined" : "Shopping item added");
      }
      return true;
    } catch (error) {
      console.error("Failed to save shopping item", error);
      showError("Could not save this item. Please try again");
      return false;
    }
  }, [items, inventory, handleAddShoppingItem, handleUpdateShoppingItem, handleDeleteShoppingItem]);

  const toggleCheck = useCallback(async (item) => {
    try {
      await handleToggleShoppingItem(item.id, item.checked);
    } catch (error) {
      console.error("Failed to toggle shopping item", error);
      showError("Could not update this item. Please try again");
    }
  }, [handleToggleShoppingItem]);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const requestDelete = useCallback((id) => setConfirmDeleteId(id), []);
  const cancelDelete = useCallback(() => setConfirmDeleteId(null), []);

  const confirmDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await handleDeleteShoppingItem(id);
      showSuccess("Shopping item deleted");
    } catch (error) {
      console.error("Failed to delete shopping item", error);
      showError("Could not delete this item. Please try again");
    }
  }, [confirmDeleteId, handleDeleteShoppingItem]);

  const [confirmBulkRemoveRecipe, setConfirmBulkRemoveRecipe] = useState(null);

  const requestBulkRemoveRecipe = useCallback((recipeTitle, count) => {
    setConfirmBulkRemoveRecipe({ recipeTitle, count });
  }, []);

  const cancelBulkRemove = useCallback(() => setConfirmBulkRemoveRecipe(null), []);

  const confirmBulkRemove = useCallback(async (recipeItemBuckets) => {
    if (!confirmBulkRemoveRecipe) return;
    const { recipeTitle } = confirmBulkRemoveRecipe;
    setConfirmBulkRemoveRecipe(null);
    const ids = recipeItemBuckets[recipeTitle] || [];
    if (ids.length === 0) return;
    try {
      if (handleDeleteShoppingItems) {
        await handleDeleteShoppingItems(ids);
      } else {
        await Promise.all(ids.map((id) => handleDeleteShoppingItem(id)));
      }
    } catch (error) {
      console.error("Failed to remove recipe items", error);
      showError("Could not remove these items. Please try again");
    }
  }, [confirmBulkRemoveRecipe, handleDeleteShoppingItems, handleDeleteShoppingItem]);

 
  const handleAcceptPantrySwap = useCallback(async (item) => {
    const priceMeta = resolvePrice(item);
    const saved = priceMeta.price !== null ? Number(priceMeta.price.toFixed(2)) : 0;

    try {
      await handleDeleteShoppingItem(item.id);
    } catch (error) {
      console.error("Failed to delete shopping item", error);
      return;
    }

    const substituteItemName = String(item?.aiSubstituteItem || "").trim().toLowerCase();
    if (substituteItemName) {
      const matchedInventoryItem = (inventory || []).find((inv) => {
        const invName = String(inv?.name || "").trim().toLowerCase();
        return invName === substituteItemName || invName.includes(substituteItemName) || substituteItemName.includes(invName);
      });
      if (matchedInventoryItem?.id) {
        try {
          await handleActionFood(matchedInventoryItem.id, "eaten");
        } catch (error) {
          console.error("Failed to record pantry swap in impact history", error);
        }
      }
    }

    onSwapAccepted?.(saved);
    showSuccess("Pantry swap accepted. Item removed from your shopping list");
  }, [resolvePrice, inventory, handleDeleteShoppingItem, handleActionFood, onSwapAccepted]);

  const handleToggleSelectAllManual = useCallback(async () => {
    if (manualItems.length === 0) return;
    const ids = manualItems.map((item) => item.id).filter(Boolean);
    try {
      await handleBatchUpdateShoppingItems(ids, { checked: !isAllManualSelected });
    } catch (error) {
      console.error("Failed to update item selection", error);
      showError("Could not update item selection. Please try again");
    }
  }, [manualItems, isAllManualSelected, handleBatchUpdateShoppingItems]);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferDrafts, setTransferDrafts] = useState({});
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [missingExpiryConfirm, setMissingExpiryConfirm] = useState(null);

  const openTransferModal = useCallback(() => {
    const currentChecked = items.filter((i) => i.checked);
    if (currentChecked.length === 0) { showError("Please check at least one item to transfer"); return; }
    const initialDrafts = {};
    currentChecked.forEach((item) => {
      const resolved = resolvePrice(item);
      initialDrafts[item.id] = {
        price: resolved.price !== null && Number.isFinite(resolved.price)
          ? Number(resolved.price).toFixed(2)
          : "",
        expiry: item?.expiry || getLocalDateString(),
      };
    });
    setTransferDrafts((prev) => ({ ...prev, ...initialDrafts }));
    setIsTransferModalOpen(true);
  }, [items, resolvePrice]);

  const closeTransferModal = useCallback(() => {
    setIsTransferModalOpen(false);
    setTransferDrafts({});
    setIsPurchasing(false);
  }, []);

  const updateTransferDraft = useCallback((itemId, field, value) => {
    setTransferDrafts((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value },
    }));
  }, []);

  const handleCheckoutTransfer = useCallback(async () => {
    const checked = items.filter((i) => i.checked);
    if (checked.length === 0) { showError("Select at least one item to move"); return; }

    const itemsMissingExpiry = checked.filter((item) => {
      const draftExpiry = String(transferDrafts[item.id]?.expiry || "").trim();
      return !draftExpiry && !item?.expiry;
    });
    if (itemsMissingExpiry.length > 0) {
      const names = itemsMissingExpiry
        .map((item) => getItemLabel(item) || item?.name || "an item")
        .join(", ");

      const proceed = await new Promise((resolve) => {
        setMissingExpiryConfirm({ names, resolve });
      });

      setMissingExpiryConfirm(null);
      if (!proceed) return;
    }

    const enrichedChecked = checked.map((item) => {
      const draft = transferDrafts[item.id] || {};
      const parsed = Number.parseFloat(draft.price);
      const estimated = resolvePrice(item).price;
      const fallbackPrice = Number.isFinite(estimated) ? estimated : 0;
      const safePrice = Number.isFinite(parsed) ? Math.max(0, parsed) : fallbackPrice;
      const purchasedQuantity = Number(item.quantity) || 1;
      const pricePaid = Number(safePrice.toFixed(2));
      const expiry = String(draft.expiry || item?.expiry || "").trim();
      return { ...item, quantity: purchasedQuantity, purchasedQuantity, estimatedPrice: pricePaid, pricePaid, expiry };
    });

    setIsPurchasing(true);
    try {
      const result = await handlePurchase(enrichedChecked);
      closeTransferModal();
      if (result?.success) {
        const mergedCount = result.mergedCount || 0;
        const newBatchCount = result.newBatchCount || 0;

        if (mergedCount > 0 || newBatchCount > 0) {
          if (mergedCount > 0) {
            showSuccess("Quantity updated for existing batch");
          }
          if (newBatchCount > 0) {
            showSuccess("New batch added to preserve expiry date");
          }
        } else {
          showSuccess(
            result.movedCount === 1
              ? `1 item added to your fridge.`
              : `${result.movedCount} items added to your fridge.`
          );
        }

        if (result.skippedCount > 0) {
          showError(`${result.skippedCount} item${result.skippedCount !== 1 ? "s" : ""} could not be moved (already in fridge).`);
        }
      }
    } catch (error) {
      console.error("Failed to transfer items to inventory", error);
      closeTransferModal();
      showError("Could not move items to your inventory. Please try again");
    }
  }, [items, transferDrafts, resolvePrice, handlePurchase, closeTransferModal]);

  const confirmMissingExpiry = useCallback(() => {
    missingExpiryConfirm?.resolve(true);
    setMissingExpiryConfirm(null);
  }, [missingExpiryConfirm]);

  const cancelMissingExpiry = useCallback(() => {
    missingExpiryConfirm?.resolve(false);
    setMissingExpiryConfirm(null);
  }, [missingExpiryConfirm]);

  return {
    addModalState,
    openAddModal,
    openEditModal,
    closeAddModal,
    handleSaveItem,
    toggleCheck,
    confirmDeleteId,
    requestDelete,
    cancelDelete,
    confirmDelete,
    confirmBulkRemoveRecipe,
    requestBulkRemoveRecipe,
    cancelBulkRemove,
    confirmBulkRemove,
    handleAcceptPantrySwap,
    manualItems,
    isAllManualSelected,
    handleToggleSelectAllManual,
    isTransferModalOpen,
    transferDrafts,
    isPurchasing,
    openTransferModal,
    closeTransferModal,
    updateTransferDraft,
    handleCheckoutTransfer,
    missingExpiryConfirm,
    confirmMissingExpiry,
    cancelMissingExpiry,
  };
}
