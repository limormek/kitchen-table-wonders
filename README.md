# Kitchen Table Wonders

Brand landing site. First product: **Around the World by Bedtime** — printable
country kits for family adventures. Built with [Astro](https://astro.build),
deployed static to Cloudflare Pages.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:4321
```

```bash
npm run build        # outputs static site to ./dist
npm run preview      # preview the production build
```

Requires Node 20+ (see `.nvmrc`).

## Architecture: three tiers

The whole site is organised brand → product → SKU, so launching product #2 is
a new folder, not a refactor.

- **Brand** — Kitchen Table Wonders itself: logo, nav, footer, legal, email
  list. Content in `src/content/brand/`, components in `src/components/brand/`.
- **Product** — Around the World by Bedtime: its story, how-it-works, pricing
  model. Content in `src/content/products/around-the-world/product.json`,
  components in `src/components/product/`.
- **SKU** — the individual purchasable kits (Norway, then Japan, Italy…).
  Content in `src/content/products/around-the-world/countries/*.json`.

All content is validated at build time by the schema in `src/content.config.ts`.
A typo in any field fails `npm run build` instead of shipping broken.

## Adding the next country (SKU)

1. Copy `src/content/products/around-the-world/countries/norway.json` to e.g.
   `japan.json` and edit the fields.
2. Drop its photos in `src/assets/products/around-the-world/japan/`.
3. That's it — the schema validates it and it's ready to feature.

## Adding product #2 later

1. New content folder: `src/content/products/<new-product>/product.json`.
2. New route: `src/pages/<new-product>/index.astro`.
3. Reuse the brand Header, Footer, and newsletter for free. The homepage
   (`src/pages/index.astro`) becomes a brand home linking to both products.

## Integrations (both are wired — just add your IDs)

**Lemon Squeezy (checkout overlay).** `lemon.js` is already loaded in
`BaseLayout.astro`, and the Hero + Pricing buttons carry the
`lemonsqueezy-button` class, so they open the checkout on top of the page
instead of redirecting. To go live: in Lemon Squeezy create your product, copy
its **checkout URL**, and paste it as `checkoutUrl` in
`src/content/products/around-the-world/countries/norway.json` (replace the
`REPLACE-ME` placeholder). Test in Lemon Squeezy's **test mode** first. If JS is
ever blocked, the button still works as a normal hosted-checkout link.

**Kit / ConvertKit (email capture).** The signup form in
`NewsletterSignup.astro` posts straight to Kit. To go live: in Kit build an
**inline form**, then **Embed → HTML**, copy the form's `action` URL (looks like
`https://app.kit.com/forms/1234567/subscriptions`), and paste it as
`newsletter.kitAction` in `src/content/brand/site.json`. Until you do, the
section shows a small setup note. The form submits into a hidden iframe so the
visitor stays on your page and sees the success message; with JS disabled it
falls back to Kit's own confirmation page. The list is brand-level (one list for
all of Kitchen Table Wonders), so Norway buyers are reachable when product #2
ships — also turn on Lemon Squeezy's built-in Kit integration to add buyers
automatically.

## Deploy to Cloudflare Pages

- Framework preset: **Astro**
- Build command: `npm run build`
- Output directory: `dist`

Static output keeps you in Cloudflare's unlimited-bandwidth lane. When you add a
real backend feature later, add the Cloudflare adapter and flip only that route
to on-demand rendering.

## Still to do before launch

- [ ] Replace photo placeholders with real images (`src/assets/...`)
- [ ] Paste real Lemon Squeezy checkout URL into `norway.json` (test mode first)
- [ ] Paste real Kit form action URL into `site.json`
- [ ] Real copy on `/privacy`, `/terms`, `/refund-policy`
- [ ] `public/social/og-home.jpg` for social sharing previews
- [ ] Point your domain's DNS at Cloudflare Pages
