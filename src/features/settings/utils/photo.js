export const MAX_PHOTO_BYTES = 220000;

export const estimateBytes = (value) => new Blob([String(value || "")]).size;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image."));
    };
    image.src = url;
  });

export const buildCompressedPhotoDataUrl = async (file) => {
  const image = await loadImage(file);
  const maxDimension = 512;
  const ratio = Math.min(
    maxDimension / image.width,
    maxDimension / image.height,
    1,
  );
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare image compression.");
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (estimateBytes(dataUrl) > MAX_PHOTO_BYTES && quality > 0.3) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (estimateBytes(dataUrl) > MAX_PHOTO_BYTES) {
    throw new Error(
      "Image is still too large after compression. Please use a smaller image.",
    );
  }

  return dataUrl;
};
