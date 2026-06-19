import { useCallback, useRef, useState } from "react";
import {
  decodeBarcodeFromFile,
  fetchProductByBarcode,
  normalizeInventoryCategory,
} from "../services/barcodeService";
import { toUserFacingErrorMessage } from "../utils/errorMessages";
import { showError } from "../utils/toast";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [pendingScannedProduct, setPendingScannedProduct] = useState(null);
  const fileInputRef = useRef(null);

  const triggerBarcodeScan = useCallback(() => {
    if (pendingScannedProduct) return;
    if (isScanning) return;
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  }, [isScanning, pendingScannedProduct]);

  const handleBarcodeFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || isScanning) return;

    setIsScanning(true);

    try {
      const barcode = await decodeBarcodeFromFile(file);
      if (!barcode) {
        return;
      }

      const product = await fetchProductByBarcode(barcode);
      const fallbackProduct = {
        barcode,
        name: "",
        category: "Other",
      };
      const resolvedProduct = product || fallbackProduct;

      setPendingScannedProduct({
        barcode,
        product: resolvedProduct,
        draft: {
          name: resolvedProduct?.name || "",
          price: "",
          expiry: getLocalDateString(),
          quantity: 1,
          unit: "pcs",
          category: normalizeInventoryCategory(
            resolvedProduct?.category,
            resolvedProduct?.name
          ),
        },
      });
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not scan the barcode. Please try another image.")
      );
    } finally {
      event.target.value = "";
      setIsScanning(false);
    }
  };

  const clearPendingScannedProduct = useCallback(() => {
    setPendingScannedProduct(null);
  }, []);

  const resetScannerState = useCallback(() => {
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    fileInputRef,
    triggerBarcodeScan,
    handleBarcodeFile,
    pendingScannedProduct,
    clearPendingScannedProduct,
    resetScannerState,
  };
};
