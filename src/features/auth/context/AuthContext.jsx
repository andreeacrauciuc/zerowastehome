/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../../services/firebase";
import {
  clearFirestoreCache,
  setFirestoreCacheScope,
} from "../../../services/firestoreCache";
import {
  clearActiveFcmToken,
  getActiveFcmToken,
} from "../../../services/fcmTokenRegistry";
import {
  CONTEXT_MODE_KEY,
  clearLocalModeFlags,
  createMemberPayload,
  normalizeCode,
  resolveHouseholdByJoinCode,
} from "../../household/householdService";
import {
  CURRENT_USER_KEY,
  buildProfile,
  clearPersistedProfile,
  createFlowError,
  persistProfile,
  readJson,
  validateLoginPayload,
  validateSignupPayload,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasProfileSyncError, setHasProfileSyncError] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    const cached = readJson(CURRENT_USER_KEY, null);
    if (!cached?.uid) return null;
    return cached;
  });
  const authCleanupRef = useRef(false);
  const authRecoveryRef = useRef(false);
  const authRequestInFlightRef = useRef(false);

  const persistAndSetUser = useCallback((profile) => {
    authRecoveryRef.current = false;
    setHasProfileSyncError(false);
    persistProfile(profile);
    setCurrentUser(profile);
  }, []);

  const applyHouseholdId = useCallback(
    (householdId) => {
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, householdId: householdId || null };
        persistProfile(next);
        return next;
      });
    },
    [],
  );

  const recoverFromCorruptedState = useCallback(async () => {
    if (authRecoveryRef.current) return;
    authRecoveryRef.current = true;
    setHasProfileSyncError(true);
    clearPersistedProfile();
    setCurrentUser(null);
    try {
      await signOut(auth);
    } catch {
      // ignore signout failures; auth state listener will resolve readiness
    }
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthUser(firebaseUser || null);
      setFirestoreCacheScope(firebaseUser?.uid || null);

      if (!firebaseUser) {
        clearFirestoreCache();
        authCleanupRef.current = false;
        authRecoveryRef.current = false;
        setHasProfileSyncError(false);
        clearPersistedProfile();
        setCurrentUser(null);
        setIsAuthReady(true);
        return;
      }

      setHasProfileSyncError(false);
      setIsAuthReady(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser?.uid) return undefined;

    const userRef = doc(db, "users", authUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      async (snapshot) => {
        try {
          if (authCleanupRef.current) {
            return;
          }

          if (!snapshot.exists()) {
            if (authRequestInFlightRef.current) {
              return;
            }

            const repairedProfile = buildProfile(authUser);
            await setDoc(userRef, repairedProfile, { merge: true });
            if (!authCleanupRef.current) {
              persistAndSetUser(repairedProfile);
            }
            return;
          }

          const profile = buildProfile(authUser, snapshot.data());

          persistAndSetUser(profile);
        } catch {
          recoverFromCorruptedState("user snapshot failed");
        }
      },
      () => {
        recoverFromCorruptedState("user snapshot failed");
      },
    );

    return () => unsubscribe();
  }, [authUser, persistAndSetUser, recoverFromCorruptedState]);

  useEffect(() => {
    if (!authUser || currentUser) return undefined;

    let isActive = true;
    const userRef = doc(db, "users", authUser.uid);

    getDoc(userRef)
      .then(async (snapshot) => {
        if (!isActive) return;

        if (authRequestInFlightRef.current) {
          return;
        }

        if (snapshot.exists()) {
          const profile = buildProfile(authUser, snapshot.data());
          persistAndSetUser(profile);
          return;
        }

        const profile = buildProfile(authUser);
        try {
          await setDoc(userRef, profile, { merge: true });
        } catch {
          await recoverFromCorruptedState("missing user profile repair failed");
          return;
        }
        if (isActive) {
          persistAndSetUser(profile);
        }
      })
      .catch(() => {
        if (isActive) {
          recoverFromCorruptedState("user profile load failed");
        }
      });

    return () => {
      isActive = false;
    };
  }, [authUser, currentUser, persistAndSetUser, recoverFromCorruptedState]);

  useEffect(() => {
    if (!authUser) {
      setIsAuthReady(true);
      return;
    }

    setIsAuthReady(Boolean(currentUser) || hasProfileSyncError);
  }, [authUser, currentUser, hasProfileSyncError]);

  const signup = useCallback(
    async ({ fullName, email, password, householdInviteCode }) => {
      if (authRequestInFlightRef.current) {
        throw createFlowError(
          "Authentication request already in progress",
          "AUTH_REQUEST_IN_PROGRESS",
        );
      }

      authRequestInFlightRef.current = true;
      authCleanupRef.current = false;
      setHasProfileSyncError(false);
      setIsAuthenticating(true);
      let createdUser = null;
      try {
        const normalizedEmail = validateSignupPayload({
          fullName,
          email,
          password,
        });
        const normalizedCode = normalizeCode(householdInviteCode);
        let householdDoc = null;

        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        createdUser = credential.user;

        const trimmedName = fullName.trim();
        try {
          await updateProfile(createdUser, { displayName: trimmedName });
        } catch {
          // Non-fatal: the Firestore doc remains the primary source of truth.
        }

        if (normalizedCode) {
          householdDoc = await resolveHouseholdByJoinCode(normalizedCode);
          if (!householdDoc) {
            throw createFlowError(
              "Invalid household join code",
              "AUTH_INVALID_JOIN_CODE",
            );
          }
        }

        const profile = {
          uid: createdUser.uid,
          ownerId: createdUser.uid,
          fullName: trimmedName,
          email: normalizedEmail,
          photoDataUrl: "",
          householdId: null,
          createdAt: new Date().toISOString(),
        };

        const userRef = doc(db, "users", profile.uid);
        if (householdDoc) {
          const householdRef = householdDoc.ref;
          const memberPayload = createMemberPayload(profile, "member");

          profile.householdId = householdDoc.id;

          await runTransaction(db, async (transaction) => {
            const householdSnap = await transaction.get(householdRef);
            if (!householdSnap.exists()) {
              throw new Error("Household not found for this join code");
            }

            transaction.set(
              householdRef,
              {
                members: arrayUnion(memberPayload),
                memberIds: arrayUnion(profile.uid),
                lastJoinCodeUsed: normalizedCode,
                updatedAt: new Date().toISOString(),
              },
              { merge: true },
            );
            transaction.set(userRef, profile, { merge: true });
          });
        } else {
          await setDoc(userRef, profile, { merge: true });
        }

        if (profile.householdId) {
          clearLocalModeFlags(profile.uid);
        }
        persistAndSetUser(profile);
        if (profile.householdId) {
          localStorage.setItem(CONTEXT_MODE_KEY, "household");
        }
        return profile;
      } catch (error) {
        if (createdUser) {
          authCleanupRef.current = true;
          clearPersistedProfile();
          setCurrentUser(null);
          try {
            await deleteUser(createdUser);
          } catch {
            try {
              await signOut(auth);
            } catch {
              // ignore cleanup failures; auth state listener will resolve readiness
            }
          }

          authCleanupRef.current = false;

          if (error?.code === "AUTH_INVALID_JOIN_CODE") {
            throw error;
          }
        }

        if (createdUser) {
          throw createFlowError(
            "Your account could not be fully created. The signup was rolled back; please try again",
            "FIRESTORE_PROFILE_CREATE_FAILED",
          );
        }

        throw error;
      } finally {
        authRequestInFlightRef.current = false;
        setIsAuthenticating(false);
      }
    },
    [persistAndSetUser],
  );

  const login = useCallback(
    async ({ email, password }) => {
      if (authRequestInFlightRef.current) {
        throw createFlowError(
          "Authentication request already in progress",
          "AUTH_REQUEST_IN_PROGRESS",
        );
      }

      authRequestInFlightRef.current = true;
      authCleanupRef.current = false;
      setHasProfileSyncError(false);
      setIsAuthenticating(true);
      try {
        const normalizedEmail = validateLoginPayload({ email, password });
        const credential = await signInWithEmailAndPassword(
          auth,
          normalizedEmail,
          password,
        );

        const userRef = doc(db, "users", credential.user.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userRef);
        } catch (error) {
          // Fix: sign out and surface a profile-preparation error instead of entering the app.
          clearPersistedProfile();
          setCurrentUser(null);
          try {
            await signOut(auth);
          } catch {
            // ignore signout failures; the caller still sees the profile load error
          }
          throw createFlowError(
            error?.message ||
              "Could not prepare your profile. Please try again",
            "FIRESTORE_PROFILE_REPAIR_FAILED",
          );
        }

        let profile;
        if (userSnap.exists()) {
          profile = buildProfile(
            credential.user,
            userSnap.data(),
            normalizedEmail,
          );
        } else {
          profile = buildProfile(credential.user, {}, normalizedEmail);
          try {
            await setDoc(userRef, profile, { merge: true });
          } catch (error) {
            clearPersistedProfile();
            setCurrentUser(null);
            try {
              await signOut(auth);
            } catch {
              // ignore signout failures; the caller still sees the repair error
            }
            throw createFlowError(
              error?.message ||
                "Could not prepare your profile. Please try again",
              "FIRESTORE_PROFILE_REPAIR_FAILED",
            );
          }
        }

        if (profile.householdId) {
          try {
            const householdSnap = await getDoc(
              doc(db, "households", profile.householdId),
            );
            const householdData = householdSnap.exists()
              ? householdSnap.data()
              : null;
            const isStillMember =
              householdData &&
              (String(householdData.ownerId || "") ===
                String(credential.user.uid) ||
                (Array.isArray(householdData.memberIds) &&
                  householdData.memberIds.includes(credential.user.uid)));

            if (!isStillMember) {
              profile = { ...profile, householdId: null };
              await setDoc(userRef, { householdId: null }, { merge: true });
            }
          } catch {
            // If we can't verify the household (e.g. offline), leave the profile as-is.
          }
        }

        persistAndSetUser(profile);
        return profile;
      } finally {
        authRequestInFlightRef.current = false;
        setIsAuthenticating(false);
      }
    },
    [persistAndSetUser],
  );

  const logout = useCallback(async () => {
    setIsAuthenticating(true);
    
    const uidForCleanup = auth.currentUser?.uid || currentUser?.uid || null;
    const tokenToRemove = getActiveFcmToken();
    if (uidForCleanup && tokenToRemove) {
      try {
        await setDoc(
          doc(db, "users", uidForCleanup),
          { fcmTokens: arrayRemove(tokenToRemove) },
          { merge: true },
        );
      } catch (error) {
        console.error("AuthContext: failed to remove FCM token on logout", error);
      }
    }
    clearActiveFcmToken();

    try {
      await signOut(auth);
    } catch {
      // Session cleanup should proceed locally even if network signout fails.
    } finally {
      clearFirestoreCache();
      clearPersistedProfile();
      setCurrentUser(null);
      setIsAuthenticating(false);
      localStorage.removeItem("mw-remember-email");
    }
  }, [currentUser?.uid]);

  const value = useMemo(
    () => ({
      authStatus: !isAuthReady
        ? "loading"
        : authUser
          ? currentUser
            ? "authenticated"
            : hasProfileSyncError
              ? "corrupted"
              : "loading"
          : "unauthenticated",
      currentUser,
      isAuthenticating,
      isAuthReady,
      login,
      signup,
      logout,
      applyHouseholdId,
    }),
    [
      authUser,
      currentUser,
      hasProfileSyncError,
      isAuthenticating,
      isAuthReady,
      login,
      logout,
      signup,
      applyHouseholdId,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
