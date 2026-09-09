import type { APIRoute } from "astro";

/**
 * Generated rather than a static file, so the Sitemap line always matches
 * `site` in astro.config.mjs instead of drifting when the domain changes.
 */
export const GET: APIRoute = ({ site }) => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${new URL("sitemap-index.xml", site).href}`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
