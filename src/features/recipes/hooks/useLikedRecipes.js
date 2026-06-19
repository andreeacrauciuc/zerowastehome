import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../services/firebase";

const toRecipeId = (title) =>
  String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

export function useLikedRecipes(uid) {
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [likedRecipes, setLikedRecipes] = useState([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!uid) {
      let active = true;
      Promise.resolve().then(() => {
        if (!active) return;
        setLikedIds(new Set());
        setLikedRecipes([]);
        setIsReady(true);
      });
      return () => {
        active = false;
      };
    }

    const ref = collection(db, "users", uid, "likedRecipes");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const ids = new Set();
        const recipes = [];
        snap.forEach((docSnap) => {
          ids.add(docSnap.id);
          recipes.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLikedIds(ids);
        setLikedRecipes(
          recipes.sort((a, b) =>
            (b.savedAt || "").localeCompare(a.savedAt || ""),
          ),
        );
        setIsReady(true);
      },
      () => {
        setIsReady(true);
      },
    );

    return () => unsub();
  }, [uid]);

  const toggleLike = useCallback(
    async (recipe) => {
      if (!uid || !recipe?.title) return;
      const id = toRecipeId(recipe.title);
      const ref = doc(db, "users", uid, "likedRecipes", id);

      if (likedIds.has(id)) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          title: recipe.title || "",
          thumbnail: recipe.thumbnail || null,
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
          cookingTime: recipe.cookingTime || null,
          servingsYield: recipe.servingsYield || null,
          sustainabilityScore: recipe.sustainabilityScore || null,
          co2SavedKg: recipe.co2SavedKg || null,
          pantrySwaps: Array.isArray(recipe.pantrySwaps) ? recipe.pantrySwaps : [],
          savedAt: new Date().toISOString(),
        });
      }
    },
    [uid, likedIds],
  );

  const isLiked = useCallback(
    (recipe) => {
      if (!recipe?.title) return false;
      return likedIds.has(toRecipeId(recipe.title));
    },
    [likedIds],
  );

  return { likedRecipes, likedIds, isReady, toggleLike, isLiked };
}
