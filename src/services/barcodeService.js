const OPEN_FOOD_FACTS_V2_BASES = [
  "https://world.openfoodfacts.org/api/v2",
  "https://ro.openfoodfacts.org/api/v2",
];
const OPEN_FOOD_FACTS_V0_BASES = [
  "https://world.openfoodfacts.org/api/v0",
  "https://ro.openfoodfacts.org/api/v0",
];
const PREFERRED_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

function sanitizeBarcode(raw) {
  return (raw || "").replace(/\D+/g, "").trim();
}

function getBarcodeVariants(rawBarcode) {
  const code = sanitizeBarcode(rawBarcode);
  const variants = new Set([code]);

  if (code.length === 12) variants.add(`0${code}`);
  if (code.length === 13 && code.startsWith("0")) variants.add(code.slice(1));

  return [...variants].filter(Boolean);
}

async function decodeWithNativeBarcodeDetector(file) {
  if (!("BarcodeDetector" in window)) {
    return null;
  }

  const supportedFormats = await BarcodeDetector.getSupportedFormats();
  const formats = PREFERRED_FORMATS.filter((fmt) => supportedFormats.includes(fmt));

  const detector = formats.length
    ? new BarcodeDetector({ formats })
    : new BarcodeDetector();

  const imageBitmap = await createImageBitmap(file);
  try {
    const results = await detector.detect(imageBitmap);
    return sanitizeBarcode(results?.[0]?.rawValue);
  } finally {
    imageBitmap.close();
  }
}

async function createBarcodeImageVariants(file) {
  const bitmap = await createImageBitmap(file);
  const upscale = bitmap.width < 1200 ? Math.min(2, 1200 / bitmap.width) : 1;
  const baseWidth = Math.round(bitmap.width * upscale);
  const baseHeight = Math.round(bitmap.height * upscale);

  const renderVariant = ({ rotate = 0, threshold = false, grayscale = false }) => {
    const isRotated = rotate % 180 !== 0;
    const canvas = document.createElement("canvas");
    canvas.width = isRotated ? baseHeight : baseWidth;
    canvas.height = isRotated ? baseWidth : baseHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotate * Math.PI) / 180);

    if (grayscale || threshold) {
      ctx.filter = "grayscale(100%) contrast(220%)";
    }

    ctx.drawImage(bitmap, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
    ctx.restore();

    if (threshold) {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = img;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const v = lum > 140 ? 255 : 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }
      ctx.putImageData(img, 0, 0);
    }

    return canvas.toDataURL("image/png");
  };

  const variants = [
    renderVariant({ rotate: 0, grayscale: false, threshold: false }),
    renderVariant({ rotate: 0, grayscale: true, threshold: false }),
    renderVariant({ rotate: 0, grayscale: true, threshold: true }),
    renderVariant({ rotate: 90, grayscale: true, threshold: false }),
    renderVariant({ rotate: 270, grayscale: true, threshold: false }),
  ].filter(Boolean);

  bitmap.close();
  return variants;
}

async function decodeWithZxing(file) {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import("@zxing/browser"), import("@zxing/library")]);

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);

  const reader = new BrowserMultiFormatReader(hints);
  const imageUrls = await createBarcodeImageVariants(file);

  try {
    for (const imageUrl of imageUrls) {
      try {
        const result = await Promise.race([
          reader.decodeFromImageUrl(imageUrl),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("ZXing timeout")), 10000)
          ),
        ]);
        const code = sanitizeBarcode(result?.getText?.());
        if (code) return code;
      } catch {
        // Try the next processed image variant.
      }
    }

    return null;
  } finally {
    if (typeof reader.reset === "function") {
      reader.reset();
    } else if (typeof reader.stopContinuousDecode === "function") {
      reader.stopContinuousDecode();
    } else if (typeof reader.stopAsyncDecode === "function") {
      reader.stopAsyncDecode();
    }
  }
}

function normalizeText(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const VALID_CATEGORIES = [
  "Fruits",
  "Vegetables",
  "Meat",
  "Dairy",
  "Bakery",
  "Grains",
  "Other",
];

export function normalizeInventoryCategory(rawCategory, fallbackText = "") {
  const category = normalizeText(String(rawCategory || "").trim());

  if (category === "fruits" || category === "fruit") return "Fruits";
  if (category === "vegetables" || category === "vegetable" || category === "veg") {
    return "Vegetables";
  }
  if (category === "meat") return "Meat";
  if (category === "dairy") return "Dairy";
  if (category === "bread" || category === "paine" || category === "pain") return "Bakery";
  if (category === "bakery") return "Bakery";
  if (category === "grains" || category === "grain") return "Grains";
  if (category === "other") return "Other";

  const inferred = inferCategoryFromText(category || fallbackText);
  return VALID_CATEGORIES.includes(inferred) ? inferred : "Other";
}

export function inferCategoryFromText(rawText) {
  const text = normalizeText(rawText);

  if (/fruit|fruct|apple|banana|orange|berry|citrus|grape|mere|banane|portocal|pear|peach|kiwi|mango|ananas|pepene/.test(text)) {
    return "Fruits";
  }

  if (/bakery|bread|\bpain\b|\bpaine\b|croissant|pastry|patiserie|cake|cookie|biscuit|chocolate|ciocolata|donut|cozonac/.test(text)) {
    return "Bakery";
  }

  if (/vegetable|legume|tomato|potato|onion|carrot|salad|rosii|cartofi|ceapa|morcov|broccoli|cucumber|ardei|castraveti/.test(text)) {
    return "Vegetables";
  }

  if (/meat|chicken|beef|pork|ham|sausage|carne|pui|porc|vita|salam|bacon|turkey|fish|somon|ton/.test(text)) {
    return "Meat";
  }

  if (/dairy|milk|cheese|yogurt|butter|lapte|branza|iaurt|unt|smantana|cream|kefir/.test(text)) {
    return "Dairy";
  }

  if (/grain|rice|pasta|oat|flour|cereal|orez|paste|faina|cereale|quinoa|bulgur|muesli/.test(text)) {
    return "Grains";
  }

  return "Other";
}

function inferInventoryCategory(product) {
  const bucket = [
    product.categories,
    product.categories_hierarchy?.join(" "),
    product.categories_tags?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  if (!bucket.trim()) return "Other";

  return inferCategoryFromText(bucket);
}

export async function decodeBarcodeFromFile(file) {
  try {
    const nativeResult = await decodeWithNativeBarcodeDetector(file);
    if (nativeResult) {
      return nativeResult;
    }
  } catch {
    // Continue with ZXing fallback.
  }

  const zxingResult = await decodeWithZxing(file);
  if (zxingResult) {
    return zxingResult;
  }

  throw new Error("No barcode detected. Keep only one barcode in frame, close-up, good light.");
}

export async function fetchProductByBarcode(barcode) {
  let foundWithoutName = false;
  const variants = getBarcodeVariants(barcode);
  const errors = [];

  const tryV2 = async (base, code) => {
    const response = await fetch(`${base}/product/${encodeURIComponent(code)}.json`);
    if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
    return response.json();
  };

  const tryV0 = async (base, code) => {
    const response = await fetch(`${base}/product/${encodeURIComponent(code)}.json`);
    if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
    return response.json();
  };

  for (const code of variants) {
    for (const base of OPEN_FOOD_FACTS_V2_BASES) {
      try {
        const data = await tryV2(base, code);
        const product = data?.product;
        if (product && data?.status === 1) {
          const name =
            product.product_name_ro?.trim() ||
            product.product_name?.trim() ||
            product.product_name_en?.trim() ||
            product.generic_name_ro?.trim() ||
            product.generic_name?.trim();

          if (!name) {
            foundWithoutName = true;
            throw new Error("Found barcode but product name is missing.");
          }

          return {
            barcode: code,
            name,
            category: normalizeInventoryCategory(inferInventoryCategory(product)),
          };
        }
      } catch (error) {
        errors.push(error.message || "Lookup error");
      }
    }

    for (const base of OPEN_FOOD_FACTS_V0_BASES) {
      try {
        const data = await tryV0(base, code);
        const product = data?.product;
        if (product && data?.status === 1) {
          const name =
            product.product_name_ro?.trim() ||
            product.product_name?.trim() ||
            product.product_name_en?.trim() ||
            product.generic_name_ro?.trim() ||
            product.generic_name?.trim();

          if (!name) {
            foundWithoutName = true;
            throw new Error("Found barcode but product name is missing.");
          }

          return {
            barcode: code,
            name,
            category: normalizeInventoryCategory(inferInventoryCategory(product)),
          };
        }
      } catch (error) {
        errors.push(error.message || "Lookup error");
      }
    }
  }

  if (foundWithoutName) {
    throw new Error(
      "Product was found but has no name in any language. Please enter the product name manually."
    );
  }
  throw new Error(
    "Product not found in OpenFoodFacts (RO/world). Try another product or enter manually."
  );
}
