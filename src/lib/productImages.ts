import type { ImageMetadata } from "astro";

/**
 * Product photos live in src/assets/ but are referenced by filename strings
 * coming from the content JSON, so they can't be passed to <Image src="..."> directly.
 * Eagerly glob every country folder once and look each file up by its basename.
 */
const files = import.meta.glob<{ default: ImageMetadata }>(
  [
    "/src/assets/products/around-the-world/*/*.{webp,jpg,jpeg,png}",
    "!/src/assets/products/around-the-world/_unused/*",
  ],
  { eager: true },
);

const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const name = path.split("/").pop() as string;
  // Lookups are by basename, so two countries can't share a filename.
  if (byName.has(name)) throw new Error(`Duplicate product image name: ${name}`);
  byName.set(name, mod.default);
}

/** Look up an ImageMetadata by filename (e.g. "kids-craft-table.webp"). */
export function productImage(filename?: string): ImageMetadata | undefined {
  return filename ? byName.get(filename) : undefined;
}
