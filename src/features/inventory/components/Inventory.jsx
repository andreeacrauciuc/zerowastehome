import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useHousehold } from "../../household/HouseholdContext";
import { useSettings } from "../../../context/SettingsContext";
import { useNotifications } from "../../../hooks/useNotifications";
import { useCurrency } from "../../../hooks/useCurrency";
import { useFilteredInventory } from "../hooks/useFilteredInventory";
import { useInventoryActions } from "../hooks/useInventoryActions";
import { calculateNotifications } from "../utils/calculateNotifications";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import { showError } from "../../../utils/toast";
import InventoryHeader from "./InventoryHeader";
import InventoryToolbar from "./InventoryToolbar";
import InventoryEmptyState from "./InventoryEmptyState";
import InventorySkeleton from "./InventorySkeleton";
import FoodCard from "./FoodCard";
import AddFoodModal from "./AddFoodModal";
import ConfirmationModal from "./ConfirmationModal";
import NotificationDrawer from "./NotificationDrawer";
import ScannerResultModal from "./ScannerResultModal";
import CustomModal from "../../../components/ui/CustomModal";
import "../../../styles/features/inventory/Inventory.scss";

function Inventory() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { household } = useHousehold();
  const { userPreferences } = useSettings();
  const { currencyConfig } = useCurrency();
  const currencySymbol = currencyConfig?.currency === "RON" ? "RON" : "€";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalVersion, setModalVersion] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("expiry");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  const {
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
  } = useInventoryActions();

  useNotifications(inventoryItems, impactHistory);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const draft = pendingScannedProduct?.draft;
    if (!draft) return undefined;

    let isActive = true;
    queueMicrotask(() => {
      if (!isActive) return;
      openScannerModal(draft);
    });

    return () => { isActive = false; };
  }, [pendingScannedProduct, openScannerModal]);

  const { filteredItems, totalItems } = useFilteredInventory(inventoryItems, debouncedSearch, activeCategory, sortBy);

  const notifications = useMemo(
    () => calculateNotifications(inventoryItems || [], userPreferences),
    [inventoryItems, userPreferences]
  );
  const criticalNotificationCount = useMemo(
    () => notifications.filter((n) => n.level === "critical").length,
    [notifications]
  );

  const handleEditClick = (item) => { setEditingItem(item); setIsModalOpen(true); };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setModalVersion((v) => v + 1);
    setIsModalOpen(true);
  };

  const isSearchActive = debouncedSearch.trim() !== "";
  const showEmptyState = filteredItems.length === 0 && (totalItems === 0 || isSearchActive || activeCategory !== "All");

  return (
    <div className="inventory-fixed-layout">
      <InventoryHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isScanning={isScanning}
        onScanBarcode={handleTriggerBarcodeScan}
        onAddFood={handleOpenAddModal}
        criticalNotificationCount={criticalNotificationCount}
        onToggleNotifications={() => setIsNotificationDrawerOpen((prev) => !prev)}
        currentUser={currentUser}
        onProfileClick={() => navigate("/settings")}
      />

      <section className="inventory-main-content">
        <h1 className="inventory-title page-title">{household ? "Our" : "My"} <span>fridge</span></h1>
        <p className="inventory-stock-copy">
          You have <strong className="inventory-stock-highlight item-count">{totalItems} items</strong> currently in stock
        </p>

        <InventoryToolbar
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {isLoading ? (
          <InventorySkeleton />
        ) : (
          <div className="fixed-items-grid">
            {showEmptyState ? (
              <InventoryEmptyState
                totalItems={totalItems}
                isSearchActive={isSearchActive}
                activeCategory={activeCategory}
                onAddFood={() => setIsModalOpen(true)}
                onClearFilters={() => { setSearchTerm(""); setActiveCategory("All"); }}
              />
            ) : (
              filteredItems.map((item) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  currencyConfig={currencyConfig}
                  consumingIds={consumingIds}
                  onMarkEaten={handleMarkEaten}
                  onEdit={handleEditClick}
                  onDiscard={openDiscardModal}
                />
              ))
            )}
          </div>
        )}
      </section>

      <AddFoodModal
        key={editingItem ? `edit-${editingItem.id}` : `new-${modalVersion}`}
        isOpen={isModalOpen}
        initialData={editingItem}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSave={async (data) => {
          try {
            await handleSaveItem(data, editingItem);
          } catch (error) {
            showError(toUserFacingErrorMessage(error, "Could not save item. Please try again."));
          }
        }}
      />

      <input
        type="file"
        ref={scannerFileRef}
        style={{ display: "none" }}
        accept="image/*"
        capture="environment"
        onChange={handleBarcodeFile}
      />

      <ConfirmationModal
        isOpen={Boolean(discardingItem)}
        itemName={discardingItem?.name || ""}
        onWasted={handleDiscardWasted}
        onDeleteError={handleDiscardDeleteError}
        onCancel={closeDiscardModal}
      />

      <CustomModal
        isOpen={Boolean(uiModal)}
        title={uiModal?.title || "Notice"}
        message={uiModal?.message || ""}
        confirmLabel="OK"
        hideCancel
        onClose={clearUiModal}
        onConfirm={clearUiModal}
      />

      <ScannerResultModal
        isOpen={isScannerModalOpen}
        form={scannerForm}
        onFormChange={setScannerField}
        onSave={handleSaveScannedItem}
        onClose={closeScannerModal}
        currencySymbol={currencySymbol}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onConsume={handleConsumeFromNotification}
        onAddToList={handleAddToListFromNotification}
      />
    </div>
  );
}

export default Inventory;
