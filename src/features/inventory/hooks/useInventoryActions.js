import { useCallback, useState } from "react";
import { useDataStore } from "../../../hooks/useDataStore";
import { useScanner } from "../../../hooks/useScanner";
import { validateInventoryItem } from "../../../utils/validation";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import { showError, showSuccess } from "../../../utils/toast";

const DEFAULT_SCANNER_FORM = { name: "", price: "", expiry: "", category: "Other", quantity: "1", unit: "pcs" };

export function useInventoryActions() {
  const {
    inventoryItems,
    impactHistory,
    handleSaveFood,
    handleActionFood,
    handleAddShoppingItem,
    handleDeleteFoodWithoutImpact,
    isLoading,
    uiModal,
    clearUiModal,
  } = useDataStore();

  const {
    fileInputRef: scannerFileRef,
    isScanning,
    triggerBarcodeScan,
    handleBarcodeFile,
    pendingScannedProduct,
    clearPendingScannedProduct,
    resetScannerState,
  } = useScanner();

  const [consumingIds, setConsumingIds] = useState(() => new Set());
  const [discardingItem, setDiscardingItem] = useState(null);
  const [scannerForm, setScannerForm] = useState(DEFAULT_SCANNER_FORM);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  const openDiscardModal = useCallback((item) => setDiscardingItem(item || null), []);
  const closeDiscardModal = useCallback(() => setDiscardingItem(null), []);

  const handleDiscardWasted = useCallback(async () => {
    if (!discardingItem?.id) return;
    const itemName = discardingItem?.name || "Item";
    try {
      await handleActionFood(discardingItem.id, "wasted");
      showSuccess(`${itemName} moved to waste history.`);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not move item to waste history. Please try again."));
    } finally {
      closeDiscardModal();
    }
  }, [discardingItem, handleActionFood, closeDiscardModal]);

  const handleDiscardDeleteError = useCallback(async () => {
    if (!discardingItem?.id) return;
    await handleDeleteFoodWithoutImpact(discardingItem.id);
    closeDiscardModal();
  }, [discardingItem, handleDeleteFoodWithoutImpact, closeDiscardModal]);

  const handleMarkEaten = useCallback(async (itemId) => {
    if (!itemId || consumingIds.has(itemId)) return;
    const itemName = inventoryItems.find((item) => item.id === itemId)?.name || "Item";
    setConsumingIds((prev) => { const next = new Set(prev); next.add(itemId); return next; });
    try {
      await handleActionFood(itemId, "eaten");
      showSuccess(`${itemName} marked as eaten.`);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not mark item as eaten. Please try again."));
    } finally {
      setConsumingIds((prev) => { const next = new Set(prev); next.delete(itemId); return next; });
    }
  }, [consumingIds, handleActionFood, inventoryItems]);

  const handleConsumeFromNotification = useCallback(async (itemId) => {
    if (!itemId) return;
    const itemName = inventoryItems.find((item) => item.id === itemId)?.name || "Item";
    try {
      await handleActionFood(itemId, "eaten");
      showSuccess(`${itemName} marked as eaten successfully.`);
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not mark item as eaten. Please try again."));
    }
  }, [handleActionFood, inventoryItems]);

  const handleAddToListFromNotification = useCallback(async (itemPayload) => {
    if (!itemPayload) return;
    await handleAddShoppingItem(itemPayload);
  }, [handleAddShoppingItem]);

  const openScannerModal = useCallback((draft) => {
    setScannerForm({
      name: draft?.name || "",
      price: draft?.price || "",
      expiry: draft?.expiry || "",
      category: draft?.category || "Other",
      quantity: draft?.quantity || "1",
      unit: draft?.unit || "pcs",
    });
    setIsScannerModalOpen(true);
    resetScannerState();
  }, [resetScannerState]);

  const closeScannerModal = useCallback(() => {
    setIsScannerModalOpen(false);
    clearPendingScannedProduct();
    resetScannerState();
  }, [clearPendingScannedProduct, resetScannerState]);

  const setScannerField = useCallback((field, value) => {
    setScannerForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveScannedItem = useCallback(async () => {
    const safeName = String(scannerForm?.name || "").trim();
    if (!safeName) { showError("Name is required."); return; }
    if (!scannerForm?.expiry) { showError("Expiry Date is required."); return; }

    const parsedPrice = Number(scannerForm?.price);
    const hasPrice =
      String(scannerForm?.price ?? "").trim() !== "" &&
      Number.isFinite(parsedPrice) &&
      parsedPrice >= 0;

    const scannedItem = {
      name: safeName,
      quantity: scannerForm?.quantity,
      unit: scannerForm?.unit || "pcs",
      category: scannerForm?.category || pendingScannedProduct?.draft?.category || "Other",
      price: hasPrice ? parsedPrice : null,
      expiry: scannerForm.expiry,
    };

    const validation = validateInventoryItem(scannedItem);
    if (!validation.isValid) { showError(validation.error); return; }

    await handleSaveFood({ ...scannedItem, quantity: Number(scannedItem.quantity) });
    showSuccess(`Added ${safeName} from barcode ${pendingScannedProduct?.barcode || "scan"}.`);
    closeScannerModal();
  }, [scannerForm, pendingScannedProduct, handleSaveFood, closeScannerModal]);

  const handleSaveItem = useCallback(async (data, editingItem) => {
    await (editingItem
      ? handleSaveFood({ ...data, id: editingItem.id })
      : handleSaveFood(data));
  }, [handleSaveFood]);

  const handleTriggerBarcodeScan = useCallback(() => {
    if (isScannerModalOpen || isScanning) return;
    triggerBarcodeScan();
  }, [isScannerModalOpen, isScanning, triggerBarcodeScan]);

  return {
    inventoryItems,
    impactHistory,
    isLoading,
    uiModal,
    clearUiModal,
    consumingIds,
    discardingItem,
    openDiscardModal,
    closeDiscardModal,
    handleDiscardWasted,
    handleDiscardDeleteError,
    handleMarkEaten,
    handleConsumeFromNotification,
    handleAddToListFromNotification,
    scannerForm,
    setScannerField,
    isScannerModalOpen,
    openScannerModal,
    closeScannerModal,
    handleSaveScannedItem,
    handleSaveItem,
    scannerFileRef,
    isScanning,
    handleTriggerBarcodeScan,
    handleBarcodeFile,
    pendingScannedProduct,
  };
}
