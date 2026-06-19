import { useEffect, useState } from "react";
import { db } from "../../../services/firebase";
import {
  readLocalSwapSavings,
  readTodaySwapSavings,
} from "../../shopping/utils/shoppingUtils";

export const useSwapSavings = ({ currentUser, household }) => {
  const [swapSavingsToday, setSwapSavingsToday] = useState(() =>
    readLocalSwapSavings(),
  );

  useEffect(() => {
    let isMounted = true;

    const sync = async () => {
      const memberIds = [
        currentUser?.uid,
        ...(household?.memberIds || []),
      ].filter(Boolean);

      const results = await Promise.all(
        [...new Set(memberIds)].map((uid) => readTodaySwapSavings(db, uid)),
      );

      const total = results.reduce(
        (acc, val) => acc + (Number.isFinite(val) ? val : 0),
        0,
      );

      if (isMounted) setSwapSavingsToday(total);
    };

    sync();
    window.addEventListener("focus", sync);
    return () => {
      isMounted = false;
      window.removeEventListener("focus", sync);
    };
  }, [currentUser?.uid, household?.memberIds]);

  return swapSavingsToday;
};
