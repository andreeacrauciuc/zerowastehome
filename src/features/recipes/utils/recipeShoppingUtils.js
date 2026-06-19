const normalizeIngredientKey = (value) => String(value || "").trim().toLowerCase();

export const parseRecipeAmount = (amountText) => {
  const text = String(amountText || "").trim().toLowerCase();
  if (!text) {
    return { quantity: "1", unit: "unit" };
  }

  const mixedFraction = text.match(/(\d+)\s+(\d+)\/(\d+)/);
  if (mixedFraction) {
    const whole = Number(mixedFraction[1]);
    const num = Number(mixedFraction[2]);
    const den = Number(mixedFraction[3]);
    const value = den > 0 ? whole + num / den : whole;
    const quantity = Number.isFinite(value) ? Number(value.toFixed(2)).toString() : "1";

    const withoutMixed = text.replace(mixedFraction[0], "").trim();
    return { quantity, unit: parseRecipeAmount(withoutMixed).unit };
  }

  const fraction = text.match(/(\d+)\/(\d+)/);
  if (fraction) {
    const num = Number(fraction[1]);
    const den = Number(fraction[2]);
    const value = den > 0 ? num / den : 1;
    const quantity = Number.isFinite(value) ? Number(value.toFixed(2)).toString() : "1";

    const withoutFraction = text.replace(fraction[0], "").trim();
    return { quantity, unit: parseRecipeAmount(withoutFraction).unit };
  }

  const numeric = text.match(/\d+(\.\d+)?/);
  const quantity = numeric ? Number(Number(numeric[0]).toFixed(2)).toString() : "1";

  const unitRules = [
    { pattern: /\b(kg|kilogram|kilograms)\b/, unit: "kg" },
    { pattern: /\b(g|gram|grams)\b/, unit: "g" },
    { pattern: /\b(ml|milliliter|milliliters)\b/, unit: "ml" },
    { pattern: /\b(l|liter|liters)\b/, unit: "l" },
    { pattern: /\btsp|teaspoon|teaspoons\b/, unit: "tsp" },
    { pattern: /\btbsp|tablespoon|tablespoons\b/, unit: "tbsp" },
    { pattern: /\bcup|cups\b/, unit: "cup" },
    { pattern: /\bclove|cloves\b/, unit: "clove" },
    { pattern: /\bslice|slices\b/, unit: "slice" },
    { pattern: /\bcan|cans\b/, unit: "can" },
    { pattern: /\bpinch\b/, unit: "pinch" },
    { pattern: /\bpiece|pieces|egg|eggs\b/, unit: "pcs" },
  ];

  const matchedUnit = unitRules.find((rule) => rule.pattern.test(text));
  return { quantity, unit: matchedUnit?.unit || "unit" };
};

export const getPantrySwaps = (recipe) => {
  if (Array.isArray(recipe?.pantrySwaps)) return recipe.pantrySwaps;
  if (Array.isArray(recipe?.smartSubstitutions)) return recipe.smartSubstitutions;
  return [];
};

export const findSwapForIngredient = (ingredientName, pantrySwaps) => {
  const key = normalizeIngredientKey(ingredientName);
  if (!key) return null;

  return (
    (Array.isArray(pantrySwaps) ? pantrySwaps : []).find((swap) => {
      const missingKey = normalizeIngredientKey(swap?.missingIngredient);
      return missingKey === key || missingKey.includes(key) || key.includes(missingKey);
    }) || null
  );
};

export const buildMissingShoppingItems = (activeRecipe) => {
  const missing = (activeRecipe?.ingredients || []).filter((ing) => ing.isMissing);
  const pantrySwaps = getPantrySwaps(activeRecipe);

  const UNIT_NORMALIZER = {
    cup: "ml",
    cups: "ml",
    tbsp: "ml",
    tablespoon: "ml",
    tablespoons: "ml",
    tsp: "ml",
    teaspoon: "ml",
    teaspoons: "ml",
    clove: "pcs",
    cloves: "pcs",
    slice: "pcs",
    slices: "pcs",
    can: "pcs",
    cans: "pcs",
    pinch: "g",
    piece: "pcs",
    pieces: "pcs",
    unit: "pcs",
  };

  const items = missing.map((ing) => {
    const parsed = parseRecipeAmount(ing.amount);
    const normalizedUnit = UNIT_NORMALIZER[parsed.unit] || parsed.unit || "pcs";
    const aiSwap = findSwapForIngredient(ing.name, pantrySwaps);

    return {
      name: ing.name,
      category: "Other",
      quantity: parsed.quantity,
      unit: normalizedUnit,
      estimatedPrice: null,
      sourceType: "recipe-missing",
      sourceRecipeTitle: activeRecipe?.title,
      aiSubstituteItem: aiSwap?.substituteItem || null,
      aiSubstitutionReason: aiSwap?.reason || null,
    };
  });

  return { missing, items };
};
