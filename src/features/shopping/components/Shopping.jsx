import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Plus, Search, ShoppingBag, Square } from "lucide-react";
import "./Shopping.scss";
import { useDataStore } from "../../../hooks/useDataStore";
import { useAuth } from "../../auth/context/AuthContext";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";
import { useShoppingSwapSavings } from "../hooks/useSwapSavings";
import { useShoppingActions } from "../hooks/useShoppingActions";
import { useShoppingFilters } from "../hooks/useShoppingFilters";
import ShoppingHeader from "./ShoppingHeader";
import ShoppingSummary from "./ShoppingSummary";
import WeeklySuggestions from "./WeeklySuggestions";
import { useWeeklySuggestions } from "../hooks/useWeeklySuggestions";
import { showSuccess } from "../../../utils/toast";
import ShoppingItemRow from "./ShoppingItemRow";
import AddItemModal from "./AddItemModal";
import TransferModal from "./TransferModal";
import ShoppingConfirmModal from "./ShoppingConfirmModal";
import CustomModal from "../../../components/ui/CustomModal";
import UnknownPriceAlert from "./UnknownPriceAlert";
import NoShoppingImg from "../../../assets/no-shoppings.png";

const TAB_FILTERS = [
  { key: "all", label: "All items" },
  { key: "manual", label: "Manual" },
  { key: "recipe-missing", label: "Recipes" },
];

const listContainerMotion = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.03 } },
};

const MotionDiv = motion.div;
const MotionSection = motion.section;

const Shopping = () => {
  const { currencyConfig } = useCurrency();
  const { inventoryItems, shoppingItems, impactHistory, handleAddShoppingItem } =
    useDataStore();
  const { currentUser } = useAuth();

  const items = useMemo(() => shoppingItems || [], [shoppingItems]);
  const inventory = useMemo(() => inventoryItems || [], [inventoryItems]);

  const suggestionScopeId =
    currentUser?.householdId || currentUser?.uid || null;

  const {
    suggestions: weeklySuggestions,
    isDismissed: weeklyDismissed,
    dismiss: dismissWeekly,
    regenerate: regenerateWeekly,
  } = useWeeklySuggestions({
    impactHistory,
    inventoryItems: inventory,
    scopeId: suggestionScopeId,
  });

  const handleAddSuggestionsToList = async (selectedSuggestions) => {
    let added = 0;
    for (const suggestion of selectedSuggestions) {
      const result = await handleAddShoppingItem(
        {
          name: suggestion.name,
          quantity: 1,
          unit: suggestion.unit || "pcs",
          category: suggestion.category || "Other",
          estimatedPrice:
            Number(suggestion.estimatedPrice) > 0
              ? Number(suggestion.estimatedPrice)
              : null,
          sourceType: "manual",
        },
        { bypassInventoryCheck: true }
      );
      if (!result?.blocked) added += 1;
    }
    if (added > 0) {
      dismissWeekly();
      showSuccess(`${added} suggested ${added === 1 ? "item" : "items"} added to Shopping List`);
    }
    return added;
  };

  const [searchValue, setSearchValue] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const listPaneRef = useRef(null);
  const [listHighlight, setListHighlight] = useState(false);

  const viewShoppingList = () => {
    setActiveTab("all");
    setSearchValue("");
    requestAnimationFrame(() => {
      listPaneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setListHighlight(true);
      window.setTimeout(() => setListHighlight(false), 1600);
    });
  };

  const { swapSavingsToday, addSaving } = useShoppingSwapSavings(currentUser?.uid);

  const {
    resolvePrice,
    inventoryByName,
    checkedItems,
    uncheckedItems,
    recipeItemBuckets,
    sourceCostTotals,
    filteredGroups,
    pricedItems,
    marketPriceTotal,
    unknownPriceCount,
    estimatedCo2Kg,
  } = useShoppingFilters({ items, inventory, activeTab, searchValue });

  const safeSwapSavings = Math.min(swapSavingsToday, marketPriceTotal);
  const estimatedTotal = marketPriceTotal - safeSwapSavings;

  const {
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
  } = useShoppingActions({
    items,
    inventory,
    resolvePrice,
    onSwapAccepted: addSaving,
  });

  const weeklySuggestionsNode = !weeklyDismissed ? (
    <WeeklySuggestions
      suggestions={weeklySuggestions}
      onAddSelected={handleAddSuggestionsToList}
      onDismiss={dismissWeekly}
      onRegenerate={regenerateWeekly}
      onViewList={viewShoppingList}
    />
  ) : null;

  return (
    <div className="shopping-wrapper premium-split vision-shell">
      <ShoppingHeader
        items={items}
        marketPriceTotal={marketPriceTotal}
        estimatedCo2Kg={estimatedCo2Kg}
        safeSwapSavings={safeSwapSavings}
        remainingCount={uncheckedItems.length}
        checkedCount={checkedItems.length}
      />

      <div className="shopping-grid split-pane-grid">
        <section
          ref={listPaneRef}
          className={`shopping-main-pane shopping-main-column${listHighlight ? " is-view-highlight" : ""}`}
        >
          {/* Mobile-only placement: the right pane (with its copy) is hidden
              below 1024px, so render the weekly card here too where it's
              visible. CSS ensures only one instance shows per breakpoint. */}
          {weeklySuggestionsNode && (
            <div className="weekly-suggestions-mobile-slot">
              {weeklySuggestionsNode}
            </div>
          )}

          {/* Mobile-only copy of the summary. The right pane (with its own copy)
              is hidden below 1024px, so render the summary here too where it's
              visible. CSS shows exactly one instance per breakpoint. */}
          <div className="shopping-summary-mobile-slot">
            <ShoppingSummary
              totalItems={uncheckedItems.length}
              marketPrice={marketPriceTotal}
              swapSavings={safeSwapSavings}
              estimatedTotal={estimatedTotal}
              onCheckout={checkedItems.length > 0 ? openTransferModal : undefined}
              canCheckout={checkedItems.length > 0}
            />
          </div>

          <div className="shop-card top-controls-card glass-panel controls-panel">
            <div className="shopping-toolbar toolbar-row">
              <div className="search-wrap">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search by item, category, or recipe..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
              <button type="button" className="add-new-btn" onClick={openAddModal}>
                <Plus size={16} />
                Add new
              </button>
            </div>

            <div className="shopping-tabs" role="tablist" aria-label="Shopping filters">
              {TAB_FILTERS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`shopping-tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div className="source-cost-breakdown glass-panel source-cost-glass">
              <div className="cost-tile manual">
                <span className="label">Manual</span>
                <strong>{formatCurrency(sourceCostTotals.manual, currencyConfig)}</strong>
              </div>
              <div className="cost-tile recipe">
                <span className="label">Recipe missing</span>
                <strong>{formatCurrency(sourceCostTotals.recipe, currencyConfig)}</strong>
              </div>
            </div>
          )}

          <div className="list-container shopping-groups">
            {items.length === 0 ? (
              <div className="shopping-empty-state">
                <div className="shopping-empty-img-wrap">
                  <img src={NoShoppingImg} alt="Empty shopping list" className="shopping-empty-img" />
                  <div className="shopping-empty-shadow" />
                </div>
                <h2 className="shopping-empty-title">Your list is empty</h2>
                <p className="shopping-empty-body">
                  Add items manually or generate recipes to fill your shopping list
                </p>
                <button type="button" className="shopping-empty-cta" onClick={openAddModal}>
                  <Plus size={18} />
                  Add your first item
                </button>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <MotionSection
                  key={group.key}
                  className={`source-group group-card glass-panel ${group.className}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <header className="source-group-header">
                    <div className="source-heading-copy">
                      <h3>{group.title}</h3>
                      {group.subtitle ? <p>{group.subtitle}</p> : null}
                    </div>
                    <div className="source-header-actions">
                      {group.key === "manual" && manualItems.length > 0 && (
                        <button
                          type="button"
                          className={`manual-select-btn ${isAllManualSelected ? "is-active" : ""}`}
                          onClick={handleToggleSelectAllManual}
                        >
                          {isAllManualSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          {isAllManualSelected ? "Deselect all" : "Select all"}
                        </button>
                      )}
                      <span className="source-count-pill">{group.items.length}</span>
                    </div>
                  </header>

                  {group.key === "recipe-missing" && Object.keys(recipeItemBuckets).length > 0 && (
                    <div className="recipe-bulk-actions">
                      {Object.entries(recipeItemBuckets).map(([recipeTitle, ids]) => (
                        <button
                          key={recipeTitle}
                          type="button"
                          className="recipe-bulk-btn"
                          onClick={() => requestBulkRemoveRecipe(recipeTitle, ids.length)}
                        >
                          Remove {ids.length} item{ids.length > 1 ? "s" : ""} for {recipeTitle}
                        </button>
                      ))}
                    </div>
                  )}

                  {group.items.length === 0 ? (
                    <div className="source-empty">No items in this section.</div>
                  ) : (
                    <MotionDiv
                      className="group-list-motion"
                      variants={listContainerMotion}
                      initial="hidden"
                      animate="show"
                    >
                      <AnimatePresence initial={false}>
                        {group.items.map((item) => (
                          <ShoppingItemRow
                            key={item.id}
                            item={item}
                            resolvePrice={resolvePrice}
                            inventoryByName={inventoryByName}
                            inventory={inventory}
                            onToggle={toggleCheck}
                            onEdit={openEditModal}
                            onDelete={requestDelete}
                            onAcceptSwap={handleAcceptPantrySwap}
                          />
                        ))}
                      </AnimatePresence>
                    </MotionDiv>
                  )}
                </MotionSection>
              ))
            )}
          </div>
        </section>

        <div className="shopping-right-pane shopping-summary-column">
          <div className="shopping-right-pane-sticky summary-sticky-wrap">
            {weeklySuggestionsNode}

            <ShoppingSummary
              totalItems={uncheckedItems.length}
              marketPrice={marketPriceTotal}
              swapSavings={safeSwapSavings}
              estimatedTotal={estimatedTotal}
              onCheckout={checkedItems.length > 0 ? openTransferModal : undefined}
              canCheckout={checkedItems.length > 0}
            />

            <UnknownPriceAlert
              pricedItems={pricedItems}
              unknownPriceCount={unknownPriceCount}
              onReveal={() => { setActiveTab("all"); setSearchValue(""); }}
            />
          </div>
        </div>
      </div>

      <AddItemModal
        isOpen={Boolean(addModalState)}
        initialState={addModalState}
        onClose={closeAddModal}
        onSave={handleSaveItem}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        checkedItems={checkedItems}
        transferDrafts={transferDrafts}
        resolvePrice={resolvePrice}
        isPurchasing={isPurchasing}
        onUpdateDraft={updateTransferDraft}
        onConfirm={handleCheckoutTransfer}
        onClose={closeTransferModal}
      />

      <CustomModal
        isOpen={missingExpiryConfirm !== null}
        title="No expiry date"
        message={
          missingExpiryConfirm
            ? `No expiry date set for: ${missingExpiryConfirm.names}. These items will be added to your fridge without an expiry date and won't appear in expiry alerts. Transfer them anyway?`
            : ""
        }
        confirmLabel="Transfer anyway"
        cancelLabel="Go back"
        onConfirm={confirmMissingExpiry}
        onClose={cancelMissingExpiry}
      />

      <ShoppingConfirmModal
        isOpen={Boolean(confirmDeleteId)}
        title="Delete item?"
        message="This item will be permanently removed from your shopping list"
        confirmLabel="Delete"
        confirmDanger
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <ShoppingConfirmModal
        isOpen={Boolean(confirmBulkRemoveRecipe)}
        title="Remove recipe items?"
        confirmLabel="Remove"
        confirmDanger
        onConfirm={() => confirmBulkRemove(recipeItemBuckets)}
        onCancel={cancelBulkRemove}
      >
        {confirmBulkRemoveRecipe && (
          <p className="shopping-confirm-message">
            This will remove {confirmBulkRemoveRecipe.count} item{confirmBulkRemoveRecipe.count > 1 ? "s" : ""} for{" "}
            <strong>{confirmBulkRemoveRecipe.recipeTitle}</strong> from your shopping list.
          </p>
        )}
      </ShoppingConfirmModal>

      <div className="shopping-mobile-checkout">
        <div className="mobile-checkout-summary">
          <span>{uncheckedItems.length} item{uncheckedItems.length !== 1 ? "s" : ""} remaining</span>
          <span>{formatCurrency(estimatedTotal, currencyConfig)}</span>
        </div>
        {items.length > 0 && checkedItems.length === 0 && (
          <p id="mobile-checkout-disabled-hint" className="checkout-disabled-hint" role="note">
            Check off items to enable checkout
          </p>
        )}
        <button
          type="button"
          className="mobile-checkout-btn"
          onClick={checkedItems.length > 0 ? openTransferModal : openAddModal}
          disabled={items.length === 0}
          aria-describedby={
            items.length > 0 && checkedItems.length === 0 ? "mobile-checkout-disabled-hint" : undefined
          }
        >
          <ShoppingBag size={18} />
          {checkedItems.length > 0
            ? `Checkout (${checkedItems.length} checked)`
            : items.length === 0
              ? "Add your first item"
              : "Check items to checkout"}
        </button>
      </div>
    </div>
  );
};

export default Shopping;
