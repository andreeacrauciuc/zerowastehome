import { showError } from "../utils/toast";
import { t } from "../locales";
import { FOOD_ITEM_CO2_KG } from "../utils/co2";

const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_DIRECT_ENDPOINT = "/api/groq";
const GROQ_MIN_DELAY_MS = 1500;
const QUOTA_TOAST_DEDUPE_MS = 6000;
const INITIAL_RECIPE_BATCH_SIZE = 8;
const MORE_RECIPE_BATCH_SIZE = 4;

const getRecipeBatchSize = (page = 0) =>
    (Number(page) || 0) <= 0 ? INITIAL_RECIPE_BATCH_SIZE : MORE_RECIPE_BATCH_SIZE;

const MEAL_DB_FILTER_BY_ING_URL = "https://www.themealdb.com/api/json/v1/1/filter.php?i=";
const MEAL_DB_RANDOM_URL = "https://www.themealdb.com/api/json/v1/1/random.php";
const stripJsonCodeFence = (text) => {
    const raw = String(text || "");
    const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return raw.slice(firstBrace, lastBrace + 1).trim();
    }

    return raw.trim();
};

const normalizeThumbKey = (url) => String(url || "").split("?")[0].trim().toLowerCase();
const normalizeName = (value) => String(value || "").trim().toLowerCase();
const UNSPLASH_DIRECT_FALLBACKS = [
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1600&q=80",
];

const hashString = (value) => {
    const text = String(value || "");
    let hash = 0;

    for (let index = 0; index < text.length; index += 1) {
        hash = (hash << 5) - hash + text.charCodeAt(index);
        hash |= 0;
    }

    return Math.abs(hash);
};

const isLikelyFoodThumbnail = (url) => {
    const key = normalizeThumbKey(url);
    if (!key) return false;

    if (key.includes("themealdb.com") || key.includes("unsplash.com")) {
        return true;
    }

    return /\b(food|recipe|meal|dish|salad|pasta|soup|bowl|plate|cook|cuisine)\b/.test(key);
};

const tokenizeFoodText = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 3)
        .filter(
            (word) =>
                ![
                    "and",
                    "the",
                    "with",
                    "from",
                    "fresh",
                    "quick",
                    "easy",
                    "style",
                    "recipe",
                ].includes(word)
        );

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastGroqRequestAt = 0;
let inFlightRecipeRequest = null;
let inFlightRecipeRequestKey = "";
let lastQuotaToastAt = 0;
const sessionUsedThumbKeys = new Set();

const waitForGroqRateLimit = async () => {
    const now = Date.now();
    const elapsed = now - lastGroqRequestAt;
    const waitMs = Math.max(0, GROQ_MIN_DELAY_MS - elapsed);

    if (waitMs > 0) {
        await delay(waitMs);
    }

    lastGroqRequestAt = Date.now();
};

const showQuotaErrorOnce = () => {
    const now = Date.now();
    if (now - lastQuotaToastAt < QUOTA_TOAST_DEDUPE_MS) return;
    lastQuotaToastAt = now;
    showError(t("common.tooManyRequests"));
};

const buildRequestKey = (sourceItems, page, excludedTitles) =>
    JSON.stringify({
        page,
        excludedTitles: Array.isArray(excludedTitles) ? excludedTitles : [],
        items: (sourceItems || []).map((item) => ({
            id: item?.id || item?.name || "",
            name: String(item?.name || "").trim().toLowerCase(),
            quantity: Number(item?.quantity) || 0,
            unit: String(item?.unit || "").trim().toLowerCase(),
            price: Number(item?.price) || 0,
            unitPrice: Number(item?.unitPrice) || 0,
            investedValueLeft: Number(item?.investedValueLeft) || 0,
        })),
    });

const toMoneyNumber = (value) => {
    const numeric = Number.parseFloat(String(value ?? "").replace(/[^\d,.-]/g, "").replace(/,/g, "."));
    return Number.isFinite(numeric) ? numeric : null;
};

const estimateInventoryItemValue = (item) => {
    const quantity = Number(item?.quantity);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    const investedValueLeft = toMoneyNumber(item?.investedValueLeft);
    if (investedValueLeft !== null && investedValueLeft >= 0) {
        return investedValueLeft;
    }

    const unitPrice = toMoneyNumber(item?.unitPrice);
    if (unitPrice !== null && unitPrice >= 0) {
        return unitPrice * safeQuantity;
    }

    const price = toMoneyNumber(item?.price);
    if (price !== null && price >= 0) {
        const initialQuantity = Number(item?.initialQuantity);
        if (Number.isFinite(initialQuantity) && initialQuantity > 0) {
            return price * (safeQuantity / initialQuantity);
        }
        return price;
    }

    const estimatedPrice = toMoneyNumber(item?.estimatedPrice);
    if (estimatedPrice !== null && estimatedPrice >= 0) {
        return estimatedPrice * safeQuantity;
    }

    return 0;
};

const normalizePantrySwaps = (rawSwaps) => {
    const swaps = Array.isArray(rawSwaps) ? rawSwaps : [];
    const unique = new Map();

    swaps.forEach((swap) => {
        const missingIngredient = String(swap?.missingIngredient || "").trim();
        const substituteItem = String(swap?.substituteItem || "").trim();
        const reason = String(swap?.reason || "").trim();

        if (!missingIngredient || !substituteItem) return;

        const key = `${normalizeName(missingIngredient)}|${normalizeName(substituteItem)}`;
        if (unique.has(key)) return;

        unique.set(key, {
            missingIngredient,
            substituteItem,
            reason:
                reason ||
                `AI substitution: use ${substituteItem} instead of ${missingIngredient} from your pantry.`,
        });
    });

    return [...unique.values()];
};

const estimateItemKg = (item, usedQuantity) => {
    const qty = Number(usedQuantity);
    if (!Number.isFinite(qty) || qty <= 0) return 0;

    const unit = normalizeName(item?.unit);
    if (["kg", "kilogram", "kilograms"].includes(unit)) return qty;
    if (["g", "gr", "gram", "grams"].includes(unit)) return qty / 1000;
    if (["l", "liter", "liters"].includes(unit)) return qty;
    if (["ml", "milliliter", "milliliters"].includes(unit)) return qty / 1000;
    return qty * 0.2;
};

const findInventoryMatchByName = (inventoryItems, targetName) => {
    const target = normalizeName(targetName);
    if (!target) return null;

    const exact = inventoryItems.find((item) => normalizeName(item?.name) === target);
    if (exact) return exact;

    return (
        inventoryItems.find((item) => {
            const invName = normalizeName(item?.name);
            return invName.includes(target) || target.includes(invName);
        }) || null
    );
};

const parseAmountToQuantity = (amountText) => {
    const text = String(amountText || "").trim().toLowerCase();
    if (!text) return 1;

    const fractionMap = {
        "1/4": 0.25,
        "1/3": 0.33,
        "1/2": 0.5,
        "2/3": 0.67,
        "3/4": 0.75,
    };

    for (const [fraction, value] of Object.entries(fractionMap)) {
        if (text.includes(fraction)) return value;
    }

    const numericMatch = text.match(/\d+(\.\d+)?/);
    if (!numericMatch) return 1;

    const quantity = Number(numericMatch[0]);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const reconcileUsedInventory = (recipe, inventoryItems) => {
    const source = Array.isArray(recipe?.usedInventory) ? recipe.usedInventory : [];
    const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
    const matched = [];

    source.forEach((item) => {
        const quantity = Number(item?.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) return;

        const matchedInventory =
            (item?.id && inventoryItems.find((inv) => inv.id === item.id)) ||
            findInventoryMatchByName(inventoryItems, item?.name);

        if (!matchedInventory) return;

        matched.push({
            id: matchedInventory.id,
            name: matchedInventory.name,
            quantity: Math.min(quantity, Number(matchedInventory.quantity) || quantity),
        });
    });

    if (matched.length === 0) {
        ingredients
            .filter((ingredient) => !ingredient?.isMissing)
            .forEach((ingredient) => {
                const matchedInventory = findInventoryMatchByName(inventoryItems, ingredient?.name);
                if (!matchedInventory) return;

                const quantity = Math.min(
                    parseAmountToQuantity(ingredient?.amount),
                    Number(matchedInventory.quantity) || 1
                );

                matched.push({
                    id: matchedInventory.id,
                    name: matchedInventory.name,
                    quantity,
                });
            });
    }

    const mergedByKey = new Map();
    matched.forEach((item) => {
        const key = item.id || normalizeName(item.name);
        const prev = mergedByKey.get(key);
        mergedByKey.set(key, {
            ...item,
            quantity: Number(((prev?.quantity || 0) + item.quantity).toFixed(2)),
        });
    });

    return [...mergedByKey.values()].filter((item) => item.quantity > 0);
};

const buildLeftoverStorageTip = (ingredients, usedInventory, inventoryItems) => {
    const safeUsedInventory = Array.isArray(usedInventory) ? usedInventory : [];
    const inventoryById = new Map((inventoryItems || []).map((item) => [item.id, item]));

    for (const used of safeUsedInventory) {
        const matched =
            (used?.id && inventoryById.get(used.id)) ||
            findInventoryMatchByName(inventoryItems, used?.name);
        if (!matched) continue;

        const totalQty = Number(matched.quantity) || 0;
        const usedQty = Number(used.quantity) || 0;
        const leftQty = Number((totalQty - usedQty).toFixed(2));
        if (leftQty <= 0) continue;

        const unit = matched.unit || "pcs";
        const itemName = matched.name;
        const lower = normalizeName(itemName);

        if (lower.includes("onion")) {
            return `Did you only use part of the chopped onion? Keep the remaining ${leftQty} ${unit} in an airtight container with a splash of vinegar. It can stay fresh for about 5 more days.`;
        }

        if (lower.includes("herb") || lower.includes("parsley") || lower.includes("cilantro")) {
            return `You still have about ${leftQty} ${unit} of ${itemName}. Wrap it in a slightly damp paper towel and store it in a sealed box to extend freshness.`;
        }

        return `You still have roughly ${leftQty} ${unit} of ${itemName} left. Store it in an airtight container, label it with today's date, and prioritize it in your next meal.`;
    }

    const missingCount = (Array.isArray(ingredients) ? ingredients : []).filter((item) => item?.isMissing)
        .length;

    if (missingCount > 0) {
        return "To reduce waste, prep only the quantities you need today and keep leftovers in sealed containers by ingredient type.";
    }

    return "If you have any unused prepped ingredients, cool them quickly and store them in airtight containers so they can be reused safely tomorrow.";
};

const buildSustainabilityMetrics = (ingredients, usedInventory, inventoryItems) => {
    const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
    const safeUsedInventory = Array.isArray(usedInventory) ? usedInventory : [];

    const totalIngredients = safeIngredients.length;
    const availableIngredients = safeIngredients.filter((ing) => !ing?.isMissing).length;

    const ingredientsSavedPercent =
        totalIngredients > 0
            ? Number(((availableIngredients / totalIngredients) * 100).toFixed(1))
            : 0;

    const inventoryById = new Map((inventoryItems || []).map((item) => [item.id, item]));
    const foodSavedKg = Number(
        safeUsedInventory
            .reduce((sum, usedItem) => {
                const matchedInventory =
                    (usedItem?.id && inventoryById.get(usedItem.id)) ||
                    findInventoryMatchByName(inventoryItems, usedItem?.name);
                return sum + estimateItemKg(matchedInventory, usedItem?.quantity);
            }, 0)
            .toFixed(2)
    );

    const co2SavedKg = Number((foodSavedKg * FOOD_ITEM_CO2_KG).toFixed(2));
    const co2Score = clamp(co2SavedKg * 18, 0, 100);
    const sustainabilityScore = clamp(
        Math.round(ingredientsSavedPercent * 0.65 + co2Score * 0.35),
        1,
        100
    );

    return {
        sustainabilityScore,
        ingredientsSavedPercent,
        foodSavedKg,
        co2SavedKg,
    };
};

const normalizeNutrition = (nutrition) => {
    if (!nutrition || typeof nutrition !== "object") return null;

    const calories = Number(nutrition.calories);
    const protein = Number(nutrition.protein);
    const carbs = Number(nutrition.carbs);
    const fat = Number(nutrition.fat);

    return {
        calories: Number.isFinite(calories) ? Math.round(calories) : 0,
        protein: `${Number.isFinite(protein) ? protein : 0}g`,
        carbs: `${Number.isFinite(carbs) ? carbs : 0}g`,
        fat: `${Number.isFinite(fat) ? fat : 0}g`,
    };
};

const buildEcoTip = (ingredients, totalValueToSave) => {
    const available = (ingredients || []).filter((ing) => !ing?.isMissing);
    if (available.length === 0) {
        return `Using these items now can prevent about ${totalValueToSave.toFixed(2)} in food waste.`;
    }
    const firstName = available[0]?.name || "these ingredients";
    const tips = [
        `${firstName} is best used fresh — cooking it now saves it from going to waste.`,
        `Using ${firstName} today helps you get the most value out of your grocery budget.`,
        `Cooking with ${firstName} now prevents it from expiring unused in your fridge.`,
        `Every meal made from existing stock like ${firstName} reduces household food waste.`,
        `${firstName} and the other ingredients in this recipe are already paid for — use them now.`,
    ];
    const index = Math.abs(
        firstName.split("").reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0)
    ) % tips.length;
    return tips[index];
};

const buildWhyThisHelps = (ingredients) => {
    const missing = (ingredients || []).filter((ing) => ing?.isMissing).length;
    const total = (ingredients || []).length;
    const available = total - missing;
    if (missing === 0) {
        return `You already have everything for this recipe — no shopping needed. Perfect zero-waste meal.`;
    }
    if (missing === 1) {
        return `${available} out of ${total} ingredients are already in your fridge. Just one item to buy.`;
    }
    return `${available} out of ${total} ingredients come from your existing stock, reducing what you need to buy.`;
};

const normalizeAiRecipe = (recipe, index, totalValueToSave, inventoryItems) => {
    const ingredients = Array.isArray(recipe?.ingredients)
        ? recipe.ingredients.map((ing) => ({
                name: ing?.name || "ingredient",
                amount: ing?.amount || "as needed",
                isMissing: Boolean(ing?.isMissing),
            }))
        : [];

    const instructions = Array.isArray(recipe?.instructions)
        ? recipe.instructions.filter(Boolean)
        : [];

    const usedInventory = reconcileUsedInventory(recipe, inventoryItems);
    const pantrySwaps = normalizePantrySwaps(recipe?.pantrySwaps || recipe?.smartSubstitutions);
    const sustainability = buildSustainabilityMetrics(ingredients, usedInventory, inventoryItems);
    const leftoverStorageTip = buildLeftoverStorageTip(ingredients, usedInventory, inventoryItems);

    return {
        title: recipe?.title || `Recipe ${index + 1}`,
        cookingTime: recipe?.cookingTime || "30 min",
        servingsYield: Number(recipe?.servingsYield) || 2,
        ingredients,
        instructions:
            instructions.length > 0 ? instructions : ["Cook the ingredients until done and serve warm."],
        nutrition: normalizeNutrition(recipe?.nutrition),
        thumbnail: isLikelyFoodThumbnail(recipe?.thumbnail) ? recipe.thumbnail : null,
        ecoTip:
            recipe?.ecoTip ||
            buildEcoTip(ingredients, totalValueToSave),
        whyThisHelps:
            recipe?.whyThisHelps ||
            buildWhyThisHelps(ingredients),
        usedInventory,
        pantrySwaps,
        smartSubstitutions: pantrySwaps,
        sustainabilityScore: sustainability.sustainabilityScore,
        ingredientsSavedPercent: sustainability.ingredientsSavedPercent,
        foodSavedKg: sustainability.foodSavedKg,
        co2SavedKg: sustainability.co2SavedKg,
        leftoverStorageTip,
        estimatedSavings:
            Number.isFinite(Number(recipe?.estimatedSavings))
                ? Number(recipe.estimatedSavings)
                : totalValueToSave,
    };
};

const toRecipeKey = (title) =>
    normalizeName(title)
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

const dedupeRecipesByTitle = (recipes, excludedTitles = []) => {
    const seen = new Set(
        (Array.isArray(excludedTitles) ? excludedTitles : [])
            .map((title) => toRecipeKey(title))
            .filter(Boolean)
    );

    const unique = [];

    (Array.isArray(recipes) ? recipes : []).forEach((recipe) => {
        const key = toRecipeKey(recipe?.title);
        if (!key || seen.has(key)) return;
        seen.add(key);
        unique.push(recipe);
    });

    return unique;
};

const FALLBACK_RECIPE_STYLES = [
    "Skillet Bowl",
    "Quick Stir-Fry",
    "One-Pan Dinner",
    "Cozy Soup",
    "Herb Pasta",
    "Fresh Salad Bowl",
    "Savory Rice Bowl",
    "Sheet-Pan Mix",
    "Weeknight Tray Bake",
    "Pan Toss",
    "Simple Pasta Bowl",
    "Rustic Stew",
    "Warm Grain Bowl",
    "Quick Pan Meal",
    "Comfort Bowl",
    "Veggie Medley",
];

const FALLBACK_MISSING_INGREDIENTS = ["olive oil", "garlic", "salt", "black pepper", "lemon"];

const capitalizeWords = (value) =>
    String(value || "")
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const buildFallbackTitleCandidates = (lead, second, third, style) => {
    const leadName = capitalizeWords(lead?.name || "Kitchen");
    const secondName = capitalizeWords(second?.name || "Pantry");
    const thirdName = capitalizeWords(third?.name || "Table");

    return [
        `${leadName} ${style}`,
        `${leadName} and ${secondName} ${style}`,
        `${leadName} ${style} with ${secondName}`,
        `${leadName} ${style} with ${thirdName}`,
        `${leadName} ${secondName} ${style}`,
        `${leadName} ${thirdName} ${style}`,
    ];
};

const buildFallbackRecipes = (
    inventoryItems = [],
    page = 0,
    totalValueToSave = 0,
    excludedTitles = [],
    batchSize = getRecipeBatchSize(page)
) => {
    const safeItems = (Array.isArray(inventoryItems) ? inventoryItems : []).filter(
        (item) => item?.id && String(item?.name || "").trim()
    );

    if (safeItems.length === 0) return [];

    const excludedKeys = new Set(
        (Array.isArray(excludedTitles) ? excludedTitles : [])
            .map((title) => toRecipeKey(title))
            .filter(Boolean)
    );
    const createdKeys = new Set();
    const recipes = [];
    const seedOffset = Math.max(0, Number(page) || 0) * 11;
    let cursor = seedOffset;
    let guard = 0;

    while (recipes.length < batchSize && guard < batchSize * 20) {
        const lead = safeItems[cursor % safeItems.length];
        const second = safeItems[(cursor + 1) % safeItems.length];
        const third = safeItems[(cursor + 2) % safeItems.length];
        const chosen = [lead, second, third].filter(Boolean);
        const style = FALLBACK_RECIPE_STYLES[cursor % FALLBACK_RECIPE_STYLES.length];

        const titleCandidates = buildFallbackTitleCandidates(lead, second, third, style);
        const title = titleCandidates.find((candidate) => {
            const titleKey = toRecipeKey(candidate);
            return titleKey && !excludedKeys.has(titleKey) && !createdKeys.has(titleKey);
        });

        if (!title) {
            cursor += 1;
            guard += 1;
            continue;
        }

        const titleKey = toRecipeKey(title);

        createdKeys.add(titleKey);

        const ingredients = chosen.map((item) => {
            const qty = Number(item?.quantity);
            const safeQty = Number.isFinite(qty) && qty > 0 ? Math.min(qty, 1.5) : 1;
            return {
                name: item.name,
                amount: `${Number(safeQty.toFixed(2))} ${item.unit || "pcs"}`,
                isMissing: false,
            };
        });

        ingredients.push({
            name: FALLBACK_MISSING_INGREDIENTS[cursor % FALLBACK_MISSING_INGREDIENTS.length],
            amount: "to taste",
            isMissing: true,
        });

        const instructions = [
            `Prep ${chosen.map((item) => item.name).join(", ")} into bite-size pieces and heat a pan on medium heat.`,
            "Cook the firmer ingredients first, then add the quick-cooking ones and stir for 6-8 minutes.",
            "Season and adjust with a splash of water to keep the texture juicy, not dry.",
            "Serve warm immediately and refrigerate leftovers in an airtight container.",
        ];

        const rawRecipe = {
            title,
            cookingTime: `${18 + (cursor % 4) * 5} min`,
            servingsYield: 2,
            ingredients,
            instructions,
            nutrition: null,
            ecoTip: "Cook ingredients with the nearest expiry date first to reduce waste.",
            whyThisHelps: "This recipe uses items already in your fridge and limits extra shopping.",
            estimatedSavings: totalValueToSave,
            usedInventory: chosen.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: 1,
            })),
            pantrySwaps: [],
            thumbnail: null,
        };

        recipes.push(normalizeAiRecipe(rawRecipe, recipes.length, totalValueToSave, safeItems));
        cursor += 1;
        guard += 1;
    }

    return recipes;
};

const fetchJsonSafe = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("recipeService: fetchJsonSafe failed.", error);
        return null;
    }
};

const scoreMealImageCandidate = ({ mealName, recipeTitle, ingredientNames, sourceIngredient }) => {
    const mealTokens = new Set(tokenizeFoodText(mealName));
    const titleTokens = tokenizeFoodText(recipeTitle);
    const ingredientTokens = ingredientNames.flatMap(tokenizeFoodText);
    const sourceTokens = tokenizeFoodText(sourceIngredient);

    let score = 0;
    titleTokens.forEach((token) => {
        if (mealTokens.has(token)) score += 4;
    });
    ingredientTokens.forEach((token) => {
        if (mealTokens.has(token)) score += 2;
    });
    sourceTokens.forEach((token) => {
        if (mealTokens.has(token)) score += 2;
    });

    return score;
};

const pushUniqueThumb = (list, seen, meal, context) => {
    const thumb = meal?.strMealThumb;
    if (typeof thumb !== "string" || thumb.length === 0) return;
    const key = normalizeThumbKey(thumb);
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push({
        thumb,
        mealName: meal?.strMeal || "",
        score: scoreMealImageCandidate({
            mealName: meal?.strMeal || "",
            recipeTitle: context.recipeTitle,
            ingredientNames: context.ingredientNames,
            sourceIngredient: context.sourceIngredient,
        }),
    });
};

const fetchMealDbThumbnailCandidates = async (title, ingredients = []) => {
    const safeIngredients = Array.isArray(ingredients)
        ? ingredients
                .map((ing) => String(ing?.name || "").trim())
                .filter(Boolean)
                .slice(0, 3)
        : [];

    const candidates = [];
    const seen = new Set();
    const baseContext = {
        recipeTitle: String(title || "").trim(),
        ingredientNames: safeIngredients,
        sourceIngredient: "",
    };

    for (const ingredientName of safeIngredients) {
        const filtered = await fetchJsonSafe(
            `${MEAL_DB_FILTER_BY_ING_URL}${encodeURIComponent(ingredientName)}`
        );
        const meals = Array.isArray(filtered?.meals) ? filtered.meals.slice(0, 4) : [];
        const ingredientContext = { ...baseContext, sourceIngredient: ingredientName };
        meals.forEach((meal) => pushUniqueThumb(candidates, seen, meal, ingredientContext));
    }

    if (candidates.length < 3) {
        const random = await fetchJsonSafe(MEAL_DB_RANDOM_URL);
        const randomMeals = Array.isArray(random?.meals) ? random.meals : [];
        randomMeals.forEach((meal) => pushUniqueThumb(candidates, seen, meal, baseContext));
    }

    return candidates
        .sort((a, b) => b.score - a.score)
        .map((candidate) => candidate.thumb);
};

const pickUniqueFallbackImage = (seed, usedThumbKeys) => {
    const start = hashString(seed) % UNSPLASH_DIRECT_FALLBACKS.length;
    for (let i = 0; i < UNSPLASH_DIRECT_FALLBACKS.length; i += 1) {
        const candidate = UNSPLASH_DIRECT_FALLBACKS[(start + i) % UNSPLASH_DIRECT_FALLBACKS.length];
        const key = normalizeThumbKey(candidate);
        if (!usedThumbKeys.has(key)) {
            usedThumbKeys.add(key);
            return candidate;
        }
    }
    const base = UNSPLASH_DIRECT_FALLBACKS[start];
    const busted = `${base}#sig=${hashString(seed)}`;
    usedThumbKeys.add(normalizeThumbKey(busted));
    return busted;
};

const fetchUnusedRandomMealThumb = async (usedThumbKeys, maxTries = 2) => {
    for (let i = 0; i < maxTries; i += 1) {
        const random = await fetchJsonSafe(MEAL_DB_RANDOM_URL);
        const meal = Array.isArray(random?.meals) ? random.meals[0] : null;
        const thumb = meal?.strMealThumb;
        if (typeof thumb !== "string" || !thumb) continue;
        const key = normalizeThumbKey(thumb);
        if (key && !usedThumbKeys.has(key)) {
            usedThumbKeys.add(key);
            return thumb;
        }
    }
    return null;
};

const assignUniqueImages = async (recipes) => {
    const usedThumbKeys = sessionUsedThumbKeys;
    const recipesWithImages = [];

    for (const recipe of recipes) {
        const safeThumbnail = isLikelyFoodThumbnail(recipe.thumbnail) ? recipe.thumbnail : null;
        const existingThumbKey = normalizeThumbKey(safeThumbnail);
        if (existingThumbKey && !usedThumbKeys.has(existingThumbKey)) {
            usedThumbKeys.add(existingThumbKey);
            recipesWithImages.push({ ...recipe, thumbnail: safeThumbnail });
            continue;
        }

        const candidates = await fetchMealDbThumbnailCandidates(recipe.title, recipe.ingredients);
        const uniqueCandidate = candidates.find((thumb) => {
            const key = normalizeThumbKey(thumb);
            return key && !usedThumbKeys.has(key);
        });

        if (uniqueCandidate) {
            usedThumbKeys.add(normalizeThumbKey(uniqueCandidate));
            recipesWithImages.push({ ...recipe, thumbnail: uniqueCandidate });
            continue;
        }

        const randomThumb = await fetchUnusedRandomMealThumb(usedThumbKeys);
        if (randomThumb) {
            recipesWithImages.push({ ...recipe, thumbnail: randomThumb });
            continue;
        }

        const staticFallback = pickUniqueFallbackImage(recipe.title, usedThumbKeys);
        recipesWithImages.push({ ...recipe, thumbnail: staticFallback });
    }

    return recipesWithImages;
};

const generateRecipesFromGroq = async (
    inventoryItems,
    page,
    totalValueToSave,
    excludedTitles = [],
    batchSize = getRecipeBatchSize(page)
) => {
    const MAX_ITEMS_FOR_AI = 20;

    const scoredItems = inventoryItems.map((item) => {
        let priority = 0;
        if (item.expiry) {
            const daysLeft = Math.round(
                (new Date(item.expiry).setHours(0,0,0,0) - new Date().setHours(0,0,0,0))
                / 86_400_000
            );
            if (Number.isFinite(daysLeft)) {
                if (daysLeft < 0) priority += 10;
                else if (daysLeft <= 2) priority += 8;
                else if (daysLeft <= 5) priority += 5;
                else if (daysLeft <= 7) priority += 2;
            }
        }
        return { item, priority };
    });

    scoredItems.sort((a, b) => b.priority - a.priority);

    const limitedItems = scoredItems
        .slice(0, MAX_ITEMS_FOR_AI)
        .map(({ item }) => item);

    const inventoryList = limitedItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "pcs",
        category: item.category || "Other",
        expiry: item.expiry || null,
    }));

    const systemPrompt =
        "You are an experienced home cook and culinary expert. Your task is to generate realistic, delicious, and coherent recipes that a normal household would actually prepare and enjoy. Rules you must follow: (1) Only generate recipes where the combination of ingredients makes culinary sense — no bizarre pairings. (2) Every recipe must have at least 5 cooking steps with real culinary techniques (sauté, simmer, bake, etc.). (3) Cooking times must be realistic (minimum 10 minutes, maximum 90 minutes for home cooking). (4) Each recipe must be a real, named dish from an actual cuisine (Italian, Romanian, Asian, Mediterranean, etc.) — not a generic 'bowl' or 'mix'. (5) Ingredients must have realistic quantities (not '0.01 kg of pasta'). (6) If an inventory item has an unusual or unclear name, either skip it or use it only as a minor ingredient. Never build an entire recipe around an ingredient that doesn't make culinary sense.";

    const normalizedExcludedTitles = Array.isArray(excludedTitles)
        ? excludedTitles
              .map((title) => String(title || "").trim())
              .filter(Boolean)
              .slice(0, 40)
        : [];

    const userPrompt = `
Using this inventory: ${JSON.stringify(inventoryList)}

Already generated recipe titles to avoid: ${
        normalizedExcludedTitles.length > 0
            ? JSON.stringify(normalizedExcludedTitles)
            : "[]"
    }

    Generate exactly ${batchSize} plausible, real-world recipes.
    Prioritize affordable, economical meals that reduce waste and reuse the selected ingredients well.
    Do not invent expensive or niche ingredients when a simpler pantry ingredient works.
For each recipe include all fields below and explicitly mark missing ingredients as isMissing=true.
Rules:
- Use at least 60% of ingredients from the provided inventory. It is acceptable to add 2-3 standard pantry items (oil, salt, garlic, onion, spices) as missing ingredients when they are genuinely needed.
- Build each recipe around the inventory items; only add a missing ingredient when the dish genuinely cannot work without it.
- Prefer recipes that naturally fit the selected ingredients.
- If a selected ingredient does not fit a recipe, do not force it.
- Missing ingredients must be practical shopping items (salt, onion, milk, etc.).
- When possible, propose substitutions using items already in inventory, and place them in pantrySwaps.
- Keep instructions concise and actionable.
- In usedInventory, always reference ingredient names from the provided inventory and include an id when available.
- Do not reuse or slightly reword any title from the avoid-list.
- Produce distinct ideas from previous batches (different cuisine/style or preparation).

Return ONLY valid JSON with this shape:
{
    "recipes": [
        {
            "title": "string",
            "cookingTime": "string like 25 min",
            "servingsYield": 2,
            "ingredients": [
                { "name": "string", "amount": "string", "isMissing": false }
            ],
            "instructions": ["step 1", "step 2"],
            "nutrition": { "calories": 450, "protein": 22, "carbs": 40, "fat": 14 },
            "ecoTip": "string",
            "whyThisHelps": "string",
            "estimatedSavings": ${totalValueToSave.toFixed(2)},
            "usedInventory": [
                { "id": "inventory item id", "name": "exact inventory item name", "quantity": 1 }
            ],
            "pantrySwaps": [
                {
                    "missingIngredient": "string",
                    "substituteItem": "string from inventory",
                    "reason": "short practical reason"
                }
            ]
        }
    ]
}

Variation seed: ${page + 1}
`.trim();

    await waitForGroqRateLimit();

    const response = await fetch(GROQ_DIRECT_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.72,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("GROQ_UNAUTHORIZED");
        }
        if (response.status === 429) throw new Error("QUOTA_EXCEEDED");
        throw new Error("GROQ_API_ERROR");
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("GROQ_EMPTY_RESPONSE");

    let parsed;
    try {
        parsed = JSON.parse(stripJsonCodeFence(content));
    } catch {
        throw new Error("GROQ_INVALID_JSON");
    }

    const validateGroqResponse = (obj) => {
        if (!obj || typeof obj !== "object") return false;
        if (!Array.isArray(obj.recipes)) return false;
        if (obj.recipes.length > batchSize * 2) return false;

        for (const r of obj.recipes) {
            if (!r || typeof r !== "object") return false;
            if (typeof r.title !== "string" || r.title.length > 200) return false;
            if (!Array.isArray(r.instructions) || r.instructions.length > 50) return false;
            if (!Array.isArray(r.ingredients) || r.ingredients.length > 100) return false;
            if (typeof r.estimatedSavings !== "number" || !Number.isFinite(r.estimatedSavings)) return false;

            for (const ing of r.ingredients) {
                if (!ing || typeof ing !== "object") return false;
                if (typeof ing.name !== "string" || ing.name.length > 200) return false;
                if (typeof ing.amount !== "string" || ing.amount.length > 100) return false;
                if (typeof ing.isMissing !== "boolean") return false;
            }

            if (r.pantrySwaps) {
                if (!Array.isArray(r.pantrySwaps) || r.pantrySwaps.length > 50) return false;
                for (const s of r.pantrySwaps) {
                    if (!s || typeof s !== "object") return false;
                    if (typeof s.missingIngredient !== "string" || typeof s.substituteItem !== "string") return false;
                }
            }
        }
        return true;
    };

    if (!validateGroqResponse(parsed)) {
        throw new Error("GROQ_INVALID_SCHEMA");
    }

    const normalizedRecipes = Array.isArray(parsed?.recipes)
        ? parsed.recipes.map((recipe, index) =>
              normalizeAiRecipe(recipe, index, totalValueToSave, inventoryItems)
          )
        : [];

    return dedupeRecipesByTitle(normalizedRecipes, excludedTitles).slice(0, batchSize);
};

export const resetRecipeImagePool = () => {
    sessionUsedThumbKeys.clear();
};

export const generateRecipes = async (inventoryItems = [], page = 0, excludedTitles = []) => {
    const sourceItems = Array.isArray(inventoryItems) ? inventoryItems : [];
    if (sourceItems.length === 0) {
        return { recipes: [], totalValueToSave: 0, expiringItems: [] };
    }

    const requestKey = buildRequestKey(sourceItems, page, excludedTitles);
    if (inFlightRecipeRequest && inFlightRecipeRequestKey === requestKey) {
        return inFlightRecipeRequest;
    }

    const requestPromise = (async () => {
        try {
            const totalValueToSave = sourceItems.reduce((sum, item) => {
                return sum + estimateInventoryItemValue(item);
            }, 0);
            const batchSize = getRecipeBatchSize(page);

            let recipes = await generateRecipesFromGroq(
                sourceItems,
                page,
                totalValueToSave,
                excludedTitles,
                batchSize
            );

            recipes = dedupeRecipesByTitle(recipes, excludedTitles).slice(0, batchSize);

            if (!Array.isArray(recipes) || recipes.length < batchSize) {
                const fallbackRecipes = buildFallbackRecipes(
                    sourceItems,
                    page,
                    totalValueToSave,
                    excludedTitles,
                    batchSize
                );
                recipes = dedupeRecipesByTitle(
                    [...recipes, ...fallbackRecipes],
                    excludedTitles
                ).slice(0, batchSize);
            }

            const recipesWithImages = await assignUniqueImages(recipes);

            return {
                recipes: recipesWithImages,
                totalValueToSave,
                expiringItems: [],
            };
        } catch (error) {
            const errorCode = error?.message || "UNKNOWN_ERROR";
            if (errorCode === "QUOTA_EXCEEDED") {
                showQuotaErrorOnce();
            }

            const batchSize = getRecipeBatchSize(page);
            const totalValueToSave = sourceItems.reduce((sum, item) => {
                return sum + estimateInventoryItemValue(item);
            }, 0);
            const fallbackRecipes = buildFallbackRecipes(
                sourceItems,
                page,
                totalValueToSave,
                excludedTitles,
                batchSize
            );
            const uniqueFallbackRecipes = dedupeRecipesByTitle(fallbackRecipes, excludedTitles).slice(
                0,
                batchSize
            );

            if (uniqueFallbackRecipes.length > 0) {
                const recipesWithImages = await assignUniqueImages(uniqueFallbackRecipes);
                return {
                    recipes: recipesWithImages,
                    totalValueToSave,
                    expiringItems: [],
                    degraded: true,
                };
            }

            return {
                recipes: [],
                totalValueToSave: 0,
                expiringItems: [],
                error: true,
                errorCode,
            };
        }
    })();

    inFlightRecipeRequest = requestPromise;
    inFlightRecipeRequestKey = requestKey;

    try {
        return await requestPromise;
    } finally {
        if (inFlightRecipeRequest === requestPromise) {
            inFlightRecipeRequest = null;
            inFlightRecipeRequestKey = "";
        }
    }
};
