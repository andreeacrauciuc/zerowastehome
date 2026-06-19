import { useRef, useState } from "react";
import { generateRecipes, resetRecipeImagePool } from "../../../services/recipeService";
import { showError } from "../../../utils/toast";
import { t } from "../../../locales";
import { getRecipeKey } from "../utils/recipesUtils";

const INITIAL_RECIPE_COUNT = 8;
const MORE_RECIPE_COUNT = 4;

const getRecipeBatchSize = (generationIndex) =>
  Number(generationIndex) <= 0 ? INITIAL_RECIPE_COUNT : MORE_RECIPE_COUNT;

const normalizeRecipe = (recipe) => ({
  ...recipe,
  thumbnail: recipe?.thumbnail || recipe?.image || recipe?.imageUrl || null,
  image: undefined,
  imageUrl: undefined,
});

const buildFetchErrorMessage = (err) => {
  const message = err?.message || "";
  if (message.includes("GROQ_API_KEY_MISSING")) {
    return "Recipe generation is not configured. The Groq API key is missing on the server.";
  }
  if (message.includes("GROQ_UNAUTHORIZED")) {
    return "The Groq API rejected the request. The server's Groq API key may be invalid or expired.";
  }
  if (message.includes("QUOTA_EXCEEDED")) {
    return t("common.tooManyRequests");
  }
  return "Something went wrong. Please try again.";
};

export function useFetchRecipes() {
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState([]);
  const fetchInProgressRef = useRef(false);
  const generationIndexRef = useRef(0);

  const fetchRecipes = async (selectedInventory, generationIndex) => {
    if (fetchInProgressRef.current || loading || isGenerating) return false;
    fetchInProgressRef.current = true;
    setLoading(true);
    setIsGenerating(true);
    if (generationIndex > 0) setIsLoadingMore(true);

    try {
      const targetCount = getRecipeBatchSize(generationIndex);
      const maxAttempts = generationIndex === 0 ? 1 : 4;
      const existingKeys = new Set(
        generatedRecipes.map(getRecipeKey).filter(Boolean),
      );

      const collected = [];
      let attempts = 0;
      let fetchPage = generationIndex;

      while (attempts < maxAttempts && collected.length < targetCount) {
        const excludedTitles = [
          ...existingKeys,
          ...collected.map(getRecipeKey),
        ].filter(Boolean);

        const result = await generateRecipes(selectedInventory, fetchPage, excludedTitles);

        if (result?.error) {
          const msg =
            result?.errorCode === "QUOTA_EXCEEDED"
              ? t("common.tooManyRequests")
              : "Failed to generate recipe. Please try again.";
          showError(msg);
          break;
        }

        const list = (result?.recipes || []).map(normalizeRecipe);
        if (list.length === 0) break;

        list.forEach((recipe) => {
          const key = getRecipeKey(recipe);
          if (!key || existingKeys.has(key)) return;
          existingKeys.add(key);
          collected.push(recipe);
        });

        attempts += 1;
        fetchPage += 1;
      }

      setGeneratedRecipes((prev) => {
        if (generationIndex === 0) return collected.slice(0, targetCount);

        const seenKeys = new Set(prev.map(getRecipeKey));
        const additions = [];
        collected.forEach((recipe) => {
          const key = getRecipeKey(recipe);
          if (!key || seenKeys.has(key)) return;
          seenKeys.add(key);
          additions.push(recipe);
        });
        return [...prev, ...additions.slice(0, targetCount)];
      });

      if (generationIndex === 0) {
        if (collected.length === 0) {
          showError("No recipes found. Try selecting different ingredients.");
        }
      } else if (collected.length === 0) {
        showError("No more unique recipes right now. Try changing selected ingredients.");
      }

      return collected.length > 0;
    } catch (err) {
      showError(buildFetchErrorMessage(err));
      return false;
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
      setIsGenerating(false);
      setIsLoadingMore(false);
    }
  };

  const handleGenerate = (selectedInventory) => {
    if (selectedInventory.length === 0 || isGenerating) return;
    generationIndexRef.current = 0;
    resetRecipeImagePool();
    fetchRecipes(selectedInventory, 0);
  };

  const handleMoreIdeas = async (selectedInventory, onBeforeMore) => {
    onBeforeMore?.();
    if (selectedInventory.length > 0) {
      const nextIndex = generationIndexRef.current + 1;
      generationIndexRef.current = nextIndex;
      await fetchRecipes(selectedInventory, nextIndex);
    }
  };

  const resetRecipes = () => {
    generationIndexRef.current = 0;
    resetRecipeImagePool();
    setGeneratedRecipes([]);
  };

  return {
    loading,
    isGenerating,
    isLoadingMore,
    generatedRecipes,
    handleGenerate,
    handleMoreIdeas,
    resetRecipes,
  };
}
