import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { optimizeImage } from "../images";

describe("canvas image optimization", () => {
  const bitmap = { width: 4000, height: 2000, close: vi.fn() };
  const context = { drawImage: vi.fn(), imageSmoothingEnabled: false, imageSmoothingQuality: "low" };
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toBlob: vi.fn() };
  const decode = vi.fn(async () => bitmap);
  const image = () => new Blob([new Uint8Array(1000)], { type: "image/jpeg" });

  beforeEach(() => {
    vi.clearAllMocks();
    bitmap.width = 4000;
    bitmap.height = 2000;
    decode.mockResolvedValue(bitmap);
    canvas.toBlob.mockImplementation((callback) => callback(new Blob([new Uint8Array(100)], { type: "image/webp" })));
    vi.stubGlobal("createImageBitmap", decode);
    vi.stubGlobal("document", { createElement: () => canvas });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("resizes a large image, requests WebP 85%, and releases decoding resources", async () => {
    const original = image();
    const optimized = await optimizeImage(original);
    expect(optimized.type).toBe("image/webp");
    expect(optimized.size).toBeLessThan(original.size);
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1920, 960);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.85);
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
  });

  it("keeps small images at their original dimensions", async () => {
    bitmap.width = 640;
    bitmap.height = 480;
    await optimizeImage(image());
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 640, 480);
  });

  it("keeps the original if compression increases the size or WebP is unsupported", async () => {
    const original = image();
    canvas.toBlob.mockImplementation((callback) => callback(new Blob([new Uint8Array(2000)], { type: "image/webp" })));
    expect(await optimizeImage(original)).toBe(original);
    canvas.toBlob.mockImplementation((callback) => callback(new Blob(["small"], { type: "image/png" })));
    expect(await optimizeImage(original)).toBe(original);
  });

  it("preserves the original when decoding or encoding fails", async () => {
    const original = image();
    decode.mockRejectedValueOnce(new Error("Unsupported image"));
    expect(await optimizeImage(original)).toBe(original);
    canvas.toBlob.mockImplementation((callback) => callback(null));
    expect(await optimizeImage(original)).toBe(original);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("does not flatten GIF, APNG, or animated WebP", async () => {
    const apng = new Uint8Array(24);
    apng.set([97, 99, 84, 76], 12);
    const webp = new Uint8Array(22);
    webp.set([86, 80, 56, 88], 12);
    new DataView(webp.buffer).setUint32(16, 2, true);
    webp[20] = 2;
    for (const original of [new Blob(["GIF89a"], { type: "image/gif" }), new Blob([apng], { type: "image/png" }), new Blob([webp], { type: "image/webp" })]) {
      expect(await optimizeImage(original)).toBe(original);
    }
    expect(decode).not.toHaveBeenCalled();
  });
});
