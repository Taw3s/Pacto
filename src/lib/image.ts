// Client-side compression: max 1600px on the longest side, JPEG.
const MAX_SIDE = 1600;
const QUALITY = 0.8;

export async function compressImage(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  // imageOrientation honours EXIF rotation from phone cameras.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    return await encodeBitmap(bitmap, maxSide);
  } finally {
    bitmap.close();
  }
}

/** Decode one camera photo at a time; reuse the first bitmap for its thumbnail. */
export async function compressProofPhotos(files: File[]): Promise<{ photos: Blob[]; thumb: Blob }> {
  if (!files.length) throw new Error("Nenhuma foto selecionada");
  const photos: Blob[] = [];
  let thumb: Blob | undefined;
  for (const [index, file] of files.entries()) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      photos.push(await encodeBitmap(bitmap, MAX_SIDE));
      if (index === 0) thumb = await encodeBitmap(bitmap, THUMB_SIDE);
    } finally {
      bitmap.close();
    }
  }
  return { photos, thumb: thumb! };
}

async function encodeBitmap(bitmap: ImageBitmap, maxSide: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao comprimir"))), "image/jpeg", QUALITY),
    );
  } finally {
    // Release the pixel buffer even when encoding fails.
    canvas.width = canvas.height = 0;
  }
}

/** Small copy for lists and grids (feed, today): a few KB instead of ~200 KB. */
export const THUMB_SIDE = 480;
export function thumbPath(path: string) {
  return path.replace(/\.jpg$/, ".thumb.jpg");
}

/** Uploads to the private bucket under <group>/<user>/ (required by storage RLS). */
export function mediaPath(groupId: string, userId: string, prefix: string) {
  return `${groupId}/${userId}/${prefix}-${crypto.randomUUID()}.jpg`;
}
