import { useDataStore } from "../../../hooks/useDataStore";

export const useShoppingStore = () => {
  const store = useDataStore();
  return {
    shoppingItems: store.shoppingItems,
    inventoryItems: store.inventoryItems,
    handleAddShoppingFromRecipes: store.handleAddShoppingFromRecipes,
    handleAddShoppingItem: store.handleAddShoppingItem,
    handleToggleShoppingItem: store.handleToggleShoppingItem,
    handleDeleteShoppingItem: store.handleDeleteShoppingItem,
    handleDeleteShoppingItems: store.handleDeleteShoppingItems,
    handleBatchUpdateShoppingItems: store.handleBatchUpdateShoppingItems,
    handleUpdateShoppingItem: store.handleUpdateShoppingItem,
    handlePurchase: store.handlePurchase,
  };
};
