import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../services/firebase";

export const patchCurrentUserCache = (changes) => {
  try {
    const raw = sessionStorage.getItem("mw-current-user");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const nextCache = { ...parsed, ...changes };
    delete nextCache.photoDataUrl;
    sessionStorage.setItem("mw-current-user", JSON.stringify(nextCache));
  } catch {
    /* Cache sync is non-critical. */
  }
};

export const updateUserDocument = async (userId, changes) => {
  if (!userId) throw new Error("No authenticated user found");
  await setDoc(doc(db, "users", userId), changes, { merge: true });
};
