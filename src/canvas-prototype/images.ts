const maxImageSide = 1920;
const webpQuality = 0.85;

function chunkName(bytes: Uint8Array, offset: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4));
}

async function isAnimated(blob: Blob) {
  if (blob.type === "image/jpeg") return false;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  if (blob.type === "image/webp") {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const name = chunkName(bytes, offset);
      const size = view.getUint32(offset + 4, true);
      if (name === "ANIM" || name === "ANMF" || (name === "VP8X" && size > 0 && (bytes[offset + 8] & 2))) return true;
      offset += 8 + size + (size % 2);
    }
  }
  if (blob.type === "image/png") {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      if (chunkName(bytes, offset + 4) === "acTL") return true;
      offset += 12 + view.getUint32(offset);
    }
  }
  return false;
}

export async function optimizeImage(blob: Blob): Promise<Blob> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(blob.type)) return blob;
  let bitmap: ImageBitmap | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (await isAnimated(blob)) return blob;
    bitmap = await createImageBitmap(blob);
    if (!bitmap.width || !bitmap.height) return blob;
    const scale = Math.min(1, maxImageSide / Math.max(bitmap.width, bitmap.height));
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return blob;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encoded = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, "image/webp", webpQuality));
    return encoded?.type === "image/webp" && encoded.size < blob.size ? encoded : blob;
  } catch {
    // Неудачная оптимизация не мешает вставить исходное изображение
    return blob;
  } finally {
    bitmap?.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

export function omittedImagePlaceholder() {
  return new Blob([
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">',
    '<rect x="1" y="1" width="638" height="358" rx="12" fill="#f4f4f5" stroke="#a1a1aa" stroke-width="2" stroke-dasharray="10 8"/>',
    '<text x="320" y="180" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="22" fill="#52525b">Картинка не включена в экспорт</text></svg>',
  ], { type: "image/svg+xml" });
}
