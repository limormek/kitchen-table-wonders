import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * THREE TIERS, validated at build time.
 * A typo in any field fails `npm run build` instead of shipping broken.
 *
 *   brand    → Kitchen Table Wonders (logo, nav, footer, legal, email list)
 *   product  → Around the World by Bedtime (its story, how-it-works, pricing model)
 *   country  → Norway, then Japan, Italy... the individual purchasable kits (SKUs)
 */

const brand = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/brand" }),
  schema: z.object({
    name: z.string(),
    tagline: z.string().optional(),
    nav: z.array(z.object({ label: z.string(), href: z.string() })),
    footerLinks: z.array(z.object({ label: z.string(), href: z.string() })),
    social: z.object({ instagram: z.string().url().optional() }).optional(),
    // Kit (ConvertKit) form. kitAction is the `action` URL from your form's
    // HTML embed, e.g. https://app.kit.com/forms/1234567/subscriptions
    newsletter: z.object({
      kitAction: z.string(),
      successHeadline: z.string(),
      successBody: z.string(),
    }),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: "**/product.json", base: "./src/content/products" }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    tagline: z.string(),
    heroSubhead: z.string(),
    problem: z.object({
      headline: z.string(),
      body: z.string(),
      highlights: z
        .array(z.object({ label: z.string(), icon: z.string() }))
        .optional(),
    }),
    howItWorks: z.object({
      subhead: z.string(),
      steps: z.array(z.object({ title: z.string(), body: z.string() })),
      closingLine: z.string(),
    }),
    whatsInside: z.array(z.object({ label: z.string(), icon: z.string() })),
    heroBenefits: z.array(z.object({ label: z.string(), icon: z.string() })),
    faq: z
      .object({
        headline: z.string(),
        subhead: z.string(),
        items: z.array(z.object({ q: z.string(), a: z.string() })),
      })
      .optional(),
  }),
});

const countries = defineCollection({
  loader: glob({
    pattern: "**/countries/*.json",
    base: "./src/content/products",
  }),
  schema: z.object({
    slug: z.string(),
    productSlug: z.string(),
    name: z.string(),
    emoji: z.string().optional(), // label fallback only; prefer an SVG flag for display
    status: z.enum(["available", "coming-soon"]).default("available"),
    price: z.number(), // DISPLAY price only. Lemon Squeezy is the source of truth.
    priceLabel: z.string().optional(), // e.g. "Founding Family Price"
    productName: z.string(), // must match your Lemon Squeezy product name
    // Optional per-country override. Normally left out so the shared
    // PUBLIC_LEMONSQUEEZY_CHECKOUT_URL env var is used instead.
    checkoutUrl: z.string().optional(),
    images: z.object({
      hero: z.string(),
      family: z.string(),
      craft: z.string(),
      game: z.string(),
      food: z.string(),
      productPreview: z.string(),
      problem: z.string().optional(),
      featured: z.string().optional(),
    }),
    testimonial: z
      .object({
        quote: z.string(),
        secondaryQuote: z.string().optional(),
        attribution: z.string(),
      })
      .optional(),
  }),
});

export const collections = { brand, products, countries };
