import sharp from "sharp";

export async function normalizeWebpImage(bytes: Uint8Array): Promise<Buffer> {
  return sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .webp({ quality: 85 })
    .toBuffer();
}
