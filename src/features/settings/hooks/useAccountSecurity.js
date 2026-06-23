import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteUser, updatePassword } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "../../auth/context/AuthContext";
import { useHousehold } from "../../household/HouseholdContext";
import { auth, db } from "../../../services/firebase";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import { showError, showSuccess } from "../../../utils/toast";
import { FIRESTORE_BATCH_LIMIT, OWNED_DATA_COLLECTIONS } from "../constants";

const deleteOwnedDocuments = async (userId) => {
  let hadFailure = false;

  for (const collectionName of OWNED_DATA_COLLECTIONS) {
    try {
      const snap = await getDocs(
        query(collection(db, collectionName), where("ownerId", "==", userId)),
      );
      for (let i = 0; i < snap.docs.length; i += FIRESTORE_BATCH_LIMIT) {
        const chunk = snap.docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (error) {
      hadFailure = true;
      console.error(`Account deletion: failed to clean up "${collectionName}".`, error);
    }
  }

  return { hadFailure };
};

export function useAccountSecurity({ setSettingsBusy }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { leaveHousehold } = useHousehold();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const canDeleteAccount = useMemo(
    () => deleteConfirmText.trim().toUpperCase() === "DELETE",
    [deleteConfirmText],
  );

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match. Please re-enter them");
      return;
    }

    if (!auth.currentUser) {
      showError("No authenticated user found");
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordModalOpen(false);
      showSuccess("Password updated");
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update your password. Please try again"));
    }
  };

  const handleDeleteAccount = async () => {
    if (!canDeleteAccount || !currentUser?.uid || !auth.currentUser || isDeletingAccount) return;

    const userId = currentUser.uid;
    const authUser = auth.currentUser;

    try {
      setSettingsBusy(true);
      setIsDeletingAccount(true);

      if (currentUser?.householdId) {
        await leaveHousehold();
      }

      const { hadFailure } = await deleteOwnedDocuments(userId);

      try {
        await deleteDoc(doc(db, "users", userId));
      } catch (error) {
        console.error("Account deletion: failed to delete user profile document", error);
      }

      await deleteUser(authUser);
      try {
        await logout();
      } catch {
        /* Session already invalidated by deleteUser. */
      }

      showSuccess(
        hadFailure
          ? "Account deleted. Some data could not be removed and will be cleaned up automatically"
          : "Account deleted successfully",
      );
      navigate("/signin", { replace: true });
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not delete your account. Please try again"));
    } finally {
      setSettingsBusy(false);
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      showError("Could not sign out. Please try again");
    }
  };

  return {
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    deleteConfirmText,
    setDeleteConfirmText,
    isDeletingAccount,
    canDeleteAccount,
    handleChangePassword,
    handleDeleteAccount,
    handleLogout,
  };
}
