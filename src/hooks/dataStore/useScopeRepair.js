import { useEffect, useRef } from "react";
import { collection, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../services/firebase";

export const useScopeRepair = ({ currentUser, household, useLocalData }) => {
  const repairedScopeRef = useRef(null);

  useEffect(() => {
    const uid = currentUser?.uid;
    const householdId = currentUser?.householdId || household?.id || null;
    if (!uid || !householdId || useLocalData) return undefined;
    if (typeof navigator !== "undefined" && !navigator.onLine) return undefined;

    const scopeKey = `${uid}:${householdId}`;
    if (repairedScopeRef.current === scopeKey) return undefined;
    repairedScopeRef.current = scopeKey;

    let cancelled = false;

    const repairItems = async () => {
      const collections = ["inventory", "shopping", "impact", "priceHistory"];
      for (const col of collections) {
        if (cancelled) return;
        try {
          const allOwnerDocs = await getDocs(
            query(collection(db, col), where("ownerId", "==", uid))
          );

          const docsNeedingRepair = allOwnerDocs.docs.filter((docSnap) => {
            const data = docSnap.data();
            const hId = data?.householdId;
            return !hId || hId === "" || hId === null;
          });

          const snap = {
            empty: docsNeedingRepair.length === 0,
            docs: docsNeedingRepair,
          };
          if (cancelled || snap.empty) continue;

          const BATCH_LIMIT = 450;
          for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
            if (cancelled) return;
            const chunk = snap.docs.slice(i, i + BATCH_LIMIT);
            const batch = writeBatch(db);
            chunk.forEach((docSnap) => {
              batch.update(docSnap.ref, { householdId });
            });
            await batch.commit();
          }
        } catch (error) {
          // never break login. Allow a retry on the next qualifying mount.
          repairedScopeRef.current = null;
          console.error(`useDataStore: householdId backfill failed for "${col}".`, error);
        }
      }
    };

    repairItems();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, currentUser?.householdId, household?.id, useLocalData]);
};
