import type { ImageMetadata } from "astro";

/**
 * Product photos live in src/assets/ but are referenced by filename strings
 * coming from the content JSON, so they can't be passed to <Image src="..."> directly.
 * Eagerly glob the folder once and look each file up by its basename.
 */
const files = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/products/around-the-world/norway/*.{webp,jpg,jpeg,png}",
  { eager: true },
);

const byName = new Map<string, ImageMetadata>(
  Object.entries(files).map(([path, mod]) => [
    path.split("/").pop() as string,
    mod.default,
  ]),
);

/** Look up an ImageMetadata by filename (e.g. "kids-craft-table.webp"). */
export function productImage(filename?: string): ImageMetadata | undefined {
  return filename ? byName.get(filename) : undefined;
}
