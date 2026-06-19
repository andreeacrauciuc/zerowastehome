/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useLocalStorage } from "../../../hooks/useLocalStorage";

const RecipeSelectionContext = createContext(null);

export const RecipeSelectionProvider = ({ children }) => {
  const [selectedIngredients, setSelectedIngredients] = useLocalStorage("selected-ingredients", []);
  const location = useLocation();
  const isRecoveryMode = location?.state?.source === "impact-recovery" && Array.isArray(location?.state?.preselectedItemIds) && location.state.preselectedItemIds.length > 0;

  useEffect(() => {
    if (isRecoveryMode) return;
    setSelectedIngredients([]);
  }, [isRecoveryMode, setSelectedIngredients]);

  const selectedIngredientIds = useMemo(
    () => (Array.isArray(selectedIngredients) ? selectedIngredients : []),
    [selectedIngredients]
  );

  const toggleIngredient = useCallback((id) => {
    if (!id) return;
    setSelectedIngredients((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      return prevList.includes(id)
        ? prevList.filter((itemId) => itemId !== id)
        : [...prevList, id];
    });
  }, [setSelectedIngredients]);

  const clearSelection = useCallback(() => {
    setSelectedIngredients([]);
  }, [setSelectedIngredients]);

  const value = useMemo(
    () => ({
      selectedIngredients: selectedIngredientIds,
      setSelectedIngredients,
      toggleIngredient,
      clearSelection,
    }),
    [clearSelection, selectedIngredientIds, setSelectedIngredients, toggleIngredient]
  );

  return <RecipeSelectionContext.Provider value={value}>{children}</RecipeSelectionContext.Provider>;
};

export const useRecipeSelection = () => {
  const context = useContext(RecipeSelectionContext);
  if (!context) {
    throw new Error("useRecipeSelection must be used within a RecipeSelectionProvider");
  }
  return context;
};
