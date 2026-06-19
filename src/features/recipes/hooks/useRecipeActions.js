import { useCallback, useState } from "react";
import { useDataStore } from "../../../hooks/useDataStore";
import { showError, showSuccess } from "../../../utils/toast";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import { inferUsageFromIngredients } from "../utils/recipesUtils";
import { buildMissingShoppingItems } from "../utils/recipeShoppingUtils";

export function useRecipeActions(inventoryItems) {
  const { handleAddShoppingFromRecipes, handleCookRecipe } = useDataStore();
  const [isCookingRecipe, setIsCookingRecipe] = useState(false);
  const [isAddingToShopping, setIsAddingToShopping] = useState(false);
  const [cookConfirmPending, setCookConfirmPending] = useState(null);
  const [cookSuccess, setCookSuccess] = useState(false);

  const clearCookSuccess = useCallback(() => setCookSuccess(false), []);

  const handleCookedRecipe = useCallback(async (selectedRecipe) => {
    if (!selectedRecipe || isCookingRecipe) return;

    const usedInventory = inferUsageFromIngredients(selectedRecipe, inventoryItems);

    if (usedInventory.length === 0) {
      showError("This recipe does not include inventory usage data to deduct.");
      return;
    }

    const insufficientItems = usedInventory.filter((used) => {
      const inventoryItem = inventoryItems.find((inv) => inv.id === used.id);
      if (!inventoryItem) return false;
      const available = Number(inventoryItem.quantity) || 0;
      const needed = Number(used.quantity) || 0;
      return needed > available;
    });

    const summary = usedInventory
      .map((item) => {
        const rawQty = Number(item?.sourceQuantity ?? item?.quantity);
        const safeQty = Number.isFinite(rawQty) ? Number(rawQty.toFixed(2)) : 1;
        const unit = item?.sourceUnit || item?.unit || "unit";
        const inventoryItem = inventoryItems.find((inv) => inv.id === item.id);
        const available = Number(inventoryItem?.quantity) || 0;
        const isLow = safeQty > available;
        return `${safeQty}${unit ? ` ${unit}` : ""} of ${item?.name || "item"}${isLow ? ` (only ${available} ${item?.unit || "unit"} available)` : ""}`;
      })
      .join(" and ");

    const warning =
      insufficientItems.length > 0
        ? `Note: ${insufficientItems.map((i) => i.name).join(", ")} ${insufficientItems.length === 1 ? "has" : "have"} less quantity than required. Inventory will be set to 0 for ${insufficientItems.length === 1 ? "this item" : "these items"}.`
        : null;

    setCookConfirmPending({ usedInventory, summary, warning });
  }, [inventoryItems, isCookingRecipe]);

  const handleConfirmCook = useCallback(async () => {
    if (!cookConfirmPending || isCookingRecipe) return;
    const { usedInventory } = cookConfirmPending;
    setCookConfirmPending(null);

    try {
      setIsCookingRecipe(true);
      setCookSuccess(false);
      await handleCookRecipe(usedInventory);
      showSuccess("Inventory updated. Used quantities were deducted.");
      setCookSuccess(true);
    } catch (err) {
      showError(
        toUserFacingErrorMessage(err, "Could not update inventory after cooking. Please try again."),
      );
    } finally {
      setIsCookingRecipe(false);
    }
  }, [cookConfirmPending, handleCookRecipe, isCookingRecipe]);

  const handleCancelCook = useCallback(() => {
    setCookConfirmPending(null);
  }, []);

  const handleAddToShoppingList = useCallback(async (selectedRecipe) => {
    if (!selectedRecipe || isAddingToShopping) return;

    const { missing, items } = buildMissingShoppingItems(selectedRecipe);
    if (missing.length === 0) {
      showError("No missing ingredients found for this recipe.");
      return;
    }

    try {
      setIsAddingToShopping(true);
      const results = await Promise.all(
        items.map((item) => handleAddShoppingFromRecipes(item)),
      );
      const blockedCount = results.filter(
        (result) => result?.blocked && result?.source === "inventory",
      ).length;
      const addedCount = Math.max(0, missing.length - blockedCount);
      const successMessage =
        blockedCount > 0
          ? `Added ${addedCount} missing ingredient(s) to Shopping List. ${blockedCount} ingredient(s) were skipped because they already exist in inventory.`
          : `Added ${addedCount} missing ingredient(s) to Shopping List.`;

      showSuccess(successMessage);
    } catch (err) {
      showError(
        toUserFacingErrorMessage(
          err,
          "Could not add missing ingredients to the shopping list. Please try again.",
        ),
      );
    } finally {
      setIsAddingToShopping(false);
    }
  }, [handleAddShoppingFromRecipes, isAddingToShopping]);

  return {
    isCookingRecipe,
    isAddingToShopping,
    cookConfirmPending,
    cookSuccess,
    clearCookSuccess,
    handleCookedRecipe,
    handleConfirmCook,
    handleCancelCook,
    handleAddToShoppingList,
  };
}
