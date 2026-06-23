/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query as queryFirestore,
  runTransaction,
  setDoc,
  writeBatch,
  where as whereFirestore,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../auth/context/AuthContext";
import {
  CONTEXT_MODE_KEY,
  HOUSEHOLD_JOIN_CODES_COLLECTION,
  clearLocalModeFlags,
  commitBatchWithRetry,
  createMemberPayload,
  getUniqueJoinCode,
  normalizeCode,
  resolveHouseholdByJoinCode,
} from "./householdService";

const HouseholdContext = createContext(null);

const SCOPED_DATA_COLLECTIONS = ["inventory", "shopping", "impact", "priceHistory"];
const RESCOPE_BATCH_LIMIT = 450;

const createFlowError = (message, code) =>
  Object.assign(new Error(message), { code });

const isEmptyScope = (value) => value === null || value === undefined || value === "";

/**
 * Re-scope every data doc owned by `uid` whose current householdId matches
 * `fromHouseholdId` over to `toHouseholdId`. This keeps the householdId on the
 * actual data in sync with membership so a member never queries a household
 * whose docs were stranded under an old id (the stale-householdId bug).
 *
 * Querying by ownerId and filtering the householdId in JS is deliberate:
 * Firestore's `where("householdId","==",null)` matches only docs with an
 * explicit null, not docs missing the field, so the JS filter is the reliable
 * way to catch both "null" and "missing" personal docs.
 */
const rescopeOwnedData = async ({ uid, fromHouseholdId, toHouseholdId }) => {
  if (!uid) return;
  const matchEmpty = isEmptyScope(fromHouseholdId);

  for (const col of SCOPED_DATA_COLLECTIONS) {
    const snap = await getDocs(
      queryFirestore(collection(db, col), whereFirestore("ownerId", "==", uid)),
    );
    const docsToUpdate = snap.docs.filter((d) => {
      const hId = d.data()?.householdId;
      return matchEmpty ? isEmptyScope(hId) : hId === fromHouseholdId;
    });
    if (docsToUpdate.length === 0) continue;

    for (let i = 0; i < docsToUpdate.length; i += RESCOPE_BATCH_LIMIT) {
      const batch = writeBatch(db);
      docsToUpdate.slice(i, i + RESCOPE_BATCH_LIMIT).forEach((d) => {
        batch.update(d.ref, { householdId: toHouseholdId });
      });
      await commitBatchWithRetry(batch);
    }
  }
};

export function HouseholdProvider({ children }) {
  const { currentUser, applyHouseholdId } = useAuth();

  const [household, setHousehold] = useState(null);
  const [isHouseholdReady, setIsHouseholdReady] = useState(
    () => !currentUser?.householdId,
  );
  const [isMigratingData, setIsMigratingData] = useState(false);
  const [contextMode, setContextModeState] = useState(() => {
    const stored = localStorage.getItem(CONTEXT_MODE_KEY);
    return stored === "individual" || stored === "household"
      ? stored
      : "individual";
  });

  const isHouseholdAdmin = useMemo(() => {
    if (!currentUser?.uid || !household) return false;

    if (String(household.ownerId || "") === String(currentUser.uid)) {
      return true;
    }

    return Array.isArray(household.members)
      ? household.members.some(
          (member) =>
            String(member?.uid || "") === String(currentUser.uid) &&
            member?.role === "admin",
        )
      : false;
  }, [currentUser?.uid, household]);

  useEffect(() => {
    if (!currentUser?.householdId) {
      setIsHouseholdReady(true);
      setHousehold(null);
      return undefined;
    }

    setIsHouseholdReady(false);
    const householdRef = doc(db, "households", currentUser.householdId);
    const unsubscribe = onSnapshot(
      householdRef,
      (snapshot) => {
        setHousehold(
          snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
        );
        setIsHouseholdReady(true);
      },
      () => {
        setHousehold(null);
        setIsHouseholdReady(true);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.householdId]);

  useEffect(() => {
    if (!currentUser?.householdId) {
      if (contextMode !== "individual") {
        localStorage.setItem(CONTEXT_MODE_KEY, "individual");
        setContextModeState("individual");
      }
    } else {
      const stored = localStorage.getItem(CONTEXT_MODE_KEY);
      if (stored !== "individual") {
        localStorage.setItem(CONTEXT_MODE_KEY, "household");
        setContextModeState("household");
      }
    }
  }, [currentUser?.householdId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const normalizedCode = normalizeCode(household?.joinCode);
    if (
      !currentUser?.uid ||
      !household?.id ||
      !normalizedCode ||
      !isHouseholdAdmin
    ) {
      return;
    }

    setDoc(
      doc(db, HOUSEHOLD_JOIN_CODES_COLLECTION, normalizedCode),
      {
        householdId: household.id,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    ).catch((error) => {
      console.error(
        "HouseholdContext: could not sync household join code lookup.",
        error,
      );
    });
  }, [currentUser?.uid, household?.id, household?.joinCode, isHouseholdAdmin]);

  const joinHouseholdWithCode = useCallback(
    async (code) => {
      if (!currentUser?.uid) {
        throw new Error("No authenticated user.");
      }

      const normalizedCode = normalizeCode(code);
      if (!normalizedCode) {
        throw new Error("Join code is required.");
      }

      const householdDoc = await resolveHouseholdByJoinCode(normalizedCode);
      if (!householdDoc) {
        throw new Error("Household not found for this join code.");
      }

      const householdId = householdDoc.id;
      const householdRef = householdDoc.ref;
      const userRef = doc(db, "users", currentUser.uid);

      if (
        currentUser.householdId &&
        currentUser.householdId !== householdId
      ) {
        throw createFlowError(
          "You're already in a household. Leave it before joining another.",
          "ALREADY_IN_HOUSEHOLD",
        );
      }

      await runTransaction(db, async (transaction) => {
        const householdSnap = await transaction.get(householdRef);
        if (!householdSnap.exists()) {
          throw new Error("Household not found for this join code.");
        }

        const userSnap = await transaction.get(userRef);
        const existingProfile = userSnap.exists() ? userSnap.data() : {};
        const memberPayload = createMemberPayload(
          {
            ...existingProfile,
            ...currentUser,
          },
          "member",
        );

        transaction.set(userRef, { householdId }, { merge: true });
        transaction.set(
          householdRef,
          {
            members: arrayUnion(memberPayload),
            memberIds: arrayUnion(currentUser.uid),
            lastJoinCodeUsed: normalizedCode,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });

      clearLocalModeFlags(currentUser.uid);

      // Pull the member's existing personal data into the household they just
      // joined, mirroring createHouseholdAndJoin. Runs after the transaction so
      // membership (and therefore canWrite -> isHouseholdMember) is in effect.
      // Best-effort: a failure must not undo the successful join.
      setIsMigratingData(true);
      try {
        await rescopeOwnedData({
          uid: currentUser.uid,
          fromHouseholdId: null,
          toHouseholdId: householdId,
        });
      } catch (error) {
        console.error(
          "HouseholdContext: failed to migrate personal data into joined household.",
          error,
        );
      }

      applyHouseholdId(householdId);
      localStorage.setItem(CONTEXT_MODE_KEY, "household");
      setContextModeState("household");

      setIsMigratingData(true);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 1000);

      return householdId;
    },
    [currentUser, applyHouseholdId],
  );

  const createHouseholdAndJoin = useCallback(
    async ({ householdName } = {}) => {
      try {
        if (!currentUser?.uid) {
          throw new Error("No authenticated user.");
        }

        if (currentUser.householdId) {
          throw createFlowError(
            "You're already in a household. Leave it before creating another.",
            "ALREADY_IN_HOUSEHOLD",
          );
        }

        const householdRef = doc(collection(db, "households"));
        const householdId = householdRef.id;
        let joinCode;
        try {
          joinCode = await getUniqueJoinCode();
        } catch (err) {
          if (typeof window !== "undefined") {
            import("../../utils/toast").then(({ showError }) => {
              if (showError)
                showError(err.message || "Failed to generate join code.");
            });
          }
          throw err;
        }
        const name =
          String(householdName || "My Household").trim() || "My Household";
        const memberPayload = createMemberPayload(currentUser, "admin");

        const batch = writeBatch(db);

        batch.set(householdRef, {
          name,
          joinCode,
          ownerId: currentUser.uid,
          members: [memberPayload],
          memberIds: [currentUser.uid],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        batch.set(doc(db, HOUSEHOLD_JOIN_CODES_COLLECTION, joinCode), {
          householdId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        batch.set(
          doc(db, "users", currentUser.uid),
          { householdId },
          { merge: true },
        );
        await batch.commit();

        setIsMigratingData(true);
        try {
          const collectionsToMigrate = [
            "inventory",
            "shopping",
            "impact",
            "priceHistory",
          ];
          const CHUNK = 450;
          for (const col of collectionsToMigrate) {
            const snap = await getDocs(
              queryFirestore(
                collection(db, col),
                whereFirestore("ownerId", "==", currentUser.uid),
              ),
            );
            const docsToUpdate = snap.docs.filter((d) => {
              const hId = d.data()?.householdId;
              return !hId || hId === "" || hId === null;
            });
            if (docsToUpdate.length === 0) continue;
            for (let i = 0; i < docsToUpdate.length; i += CHUNK) {
              const migrationBatch = writeBatch(db);
              docsToUpdate.slice(i, i + CHUNK).forEach((d) => {
                migrationBatch.update(d.ref, { householdId });
              });
              await commitBatchWithRetry(migrationBatch);
            }
          }
        } catch (migrationError) {
          console.error(
            "createHouseholdAndJoin: data migration failed after retries.",
            migrationError,
          );
          throw createFlowError(
            "Your household was created, but moving your existing data failed. Please check your connection and try again.",
            "HOUSEHOLD_MIGRATION_FAILED",
          );
        } finally {
          setIsMigratingData(false);
        }

        applyHouseholdId(householdId);
        localStorage.setItem(CONTEXT_MODE_KEY, "household");
        setContextModeState("household");

        setIsMigratingData(true);
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }, 1000);

        return householdId;
      } catch (error) {
        console.error("HouseholdContext: create household failed.", error);
        throw error;
      }
    },
    [currentUser, applyHouseholdId],
  );

  const regenerateHouseholdJoinCode = useCallback(async () => {
    try {
      if (!currentUser?.householdId) {
        throw new Error("You are not part of a household.");
      }

      const nextCode = await getUniqueJoinCode();

      await runTransaction(db, async (transaction) => {
        const householdRef = doc(db, "households", currentUser.householdId);
        const snap = await transaction.get(householdRef);
        if (!snap.exists()) throw new Error("Household not found.");

        const data = snap.data();
        const isOwner = String(data?.ownerId || "") === String(currentUser.uid);
        const isAdminMember = Array.isArray(data?.members)
          ? data.members.some(
              (m) =>
                String(m?.uid || "") === String(currentUser.uid) &&
                m?.role === "admin",
            )
          : false;

        if (!isOwner && !isAdminMember) {
          throw new Error(
            "Only the household admin can regenerate the join code.",
          );
        }

        transaction.set(
          householdRef,
          { joinCode: nextCode, updatedAt: new Date().toISOString() },
          { merge: true },
        );
        transaction.set(
          doc(db, HOUSEHOLD_JOIN_CODES_COLLECTION, nextCode),
          {
            householdId: currentUser.householdId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
        if (data?.joinCode && data.joinCode !== nextCode) {
          transaction.delete(
            doc(db, HOUSEHOLD_JOIN_CODES_COLLECTION, data.joinCode),
          );
        }
      });

      return nextCode;
    } catch (error) {
      console.error("HouseholdContext: regenerate join code failed.", error);
      throw error;
    }
  }, [currentUser?.uid, currentUser?.householdId]);

  const leaveHousehold = useCallback(async () => {
    if (!currentUser?.uid || !currentUser?.householdId) {
      return;
    }

    const leavingUid = currentUser.uid;
    const leftHouseholdId = currentUser.householdId;
    const userRef = doc(db, "users", currentUser.uid);
    const householdRef = doc(db, "households", currentUser.householdId);

    await runTransaction(db, async (transaction) => {
      const householdSnap = await transaction.get(householdRef);
      const householdData = householdSnap.exists()
        ? householdSnap.data()
        : null;
      const members = Array.isArray(householdData?.members)
        ? householdData.members
        : [];
      let nextMembers = members.filter(
        (member) => member?.uid !== currentUser.uid,
      );
      const isOwnerLeaving =
        String(householdData?.ownerId || "") === String(currentUser.uid);

      if (isOwnerLeaving) {
        if (nextMembers.length === 0) {
          transaction.set(userRef, { householdId: null }, { merge: true });
          transaction.delete(householdRef);
          const orphanCode = normalizeCode(householdData?.joinCode);
          if (orphanCode) {
            transaction.delete(
              doc(db, HOUSEHOLD_JOIN_CODES_COLLECTION, orphanCode),
            );
          }
          return;
        }

        const nextOwner =
          nextMembers.find((member) => member?.role === "admin") ||
          nextMembers[0];
        const nextOwnerId = nextOwner?.uid || null;

        nextMembers = nextMembers.map((member) =>
          member?.uid === nextOwnerId ? { ...member, role: "admin" } : member,
        );

        transaction.set(userRef, { householdId: null }, { merge: true });
        transaction.set(
          householdRef,
          {
            ownerId: nextOwnerId,
            members: nextMembers,
            memberIds: nextMembers.map((member) => member?.uid).filter(Boolean),
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
        return;
      }

      transaction.set(userRef, { householdId: null }, { merge: true });
      transaction.set(
        householdRef,
        {
          members: nextMembers,
          memberIds: nextMembers.map((member) => member?.uid).filter(Boolean),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    });

    // Move this user's data back to personal scope so it doesn't stay stranded
    // under a household they no longer belong to. Only the leaver's own docs are
    // touched; any remaining members keep their data scoped to the surviving
    // household. Failure here must not block the (already committed) leave.
    try {
      await rescopeOwnedData({
        uid: leavingUid,
        fromHouseholdId: leftHouseholdId,
        toHouseholdId: null,
      });
    } catch (error) {
      console.error(
        "HouseholdContext: failed to re-scope data to personal after leaving.",
        error,
      );
    }

    applyHouseholdId(null);
    setHousehold(null);
    localStorage.setItem(CONTEXT_MODE_KEY, "individual");
    setContextModeState("individual");
  }, [currentUser, applyHouseholdId]);

  const switchContextMode = useCallback(
    (mode) => {
      const nextMode = mode === "individual" ? "individual" : "household";
      const safeMode = currentUser?.householdId ? nextMode : "individual";
      localStorage.setItem(CONTEXT_MODE_KEY, safeMode);
      setContextModeState(safeMode);
    },
    [currentUser?.householdId],
  );

  const value = useMemo(
    () => ({
      household,
      isHouseholdReady,
      isHouseholdAdmin,
      contextMode,
      isMigratingData,
      joinHouseholdWithCode,
      createHouseholdAndJoin,
      regenerateHouseholdJoinCode,
      leaveHousehold,
      switchContextMode,
    }),
    [
      household,
      isHouseholdReady,
      isHouseholdAdmin,
      contextMode,
      isMigratingData,
      joinHouseholdWithCode,
      createHouseholdAndJoin,
      regenerateHouseholdJoinCode,
      leaveHousehold,
      switchContextMode,
    ],
  );

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error("useHousehold must be used within a HouseholdProvider.");
  }

  return context;
}
