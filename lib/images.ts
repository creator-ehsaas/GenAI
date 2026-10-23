"use client";

/** Downscales an image file for the model (longest side <= max) and makes a small thumbnail. */
export async function prepareScreenshot(file: File, max = 1568): Promise<{ data: string; mediaType: "image/jpeg"; thumb: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const draw = (limit: number, q: number) => {
      const s = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", q);
    };
    const full = draw(max, 0.86);
    return { data: full.slice(full.indexOf(",") + 1), mediaType: "image/jpeg", thumb: draw(240, 0.6) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
