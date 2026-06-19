import { useEffect, useState } from "react";
import { db } from "../../../services/firebase";
import { readLocalSwapSavings, readTodaySwapSavings, writeTodaySwapSavings } from "../utils/shoppingUtils";

export function useShoppingSwapSavings(uid) {
  const [swapSavingsToday, setSwapSavingsToday] = useState(() => readLocalSwapSavings());

  useEffect(() => {
    let isMounted = true;
    readTodaySwapSavings(db, uid).then((value) => {
      if (isMounted) setSwapSavingsToday(value);
    });
    return () => { isMounted = false; };
  }, [uid]);

  const addSaving = (amount) => {
    if (!amount || amount <= 0) return;
    setSwapSavingsToday((prev) => {
      const next = Number((prev + amount).toFixed(2));
      writeTodaySwapSavings(next, db, uid);
      return next;
    });
  };

  return { swapSavingsToday, addSaving };
}
