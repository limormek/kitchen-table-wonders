// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static output by default = the "unlimited" lane on Cloudflare Pages.
// When you later add a real backend feature, you flip only that one route
// to on-demand rendering with the Cloudflare adapter — not the whole site.
export default defineConfig({
  // TODO: change this to your real domain once DNS is live.
  site: "https://kitchentablewonders.com",
  integrations: [sitemap()],
});
