/**
 * Link helpers.
 *
 * Checkout URLs live in an env var so connecting Lemon Squeezy is a config
 * change, not a code change. Resolution order:
 *
 *   1. the country's own `checkoutUrl` in its content JSON, if set
 *      (lets a second country have its own link later)
 *   2. PUBLIC_LEMONSQUEEZY_CHECKOUT_URL from the environment
 *   3. "#" — a harmless no-op so an unconfigured button never lands the
 *      visitor on an error page
 */

/** Placeholder values that mean "not wired up yet". */
function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  const v = value.trim();
  return v === "" || v === "#" || v.includes("REPLACE-ME") || v.includes("REPLACE_ME");
}

const ENV_CHECKOUT = import.meta.env.PUBLIC_LEMONSQUEEZY_CHECKOUT_URL as
  | string
  | undefined;

/** The URL a buy button should point at. Never returns undefined. */
export function checkoutUrl(countryCheckoutUrl?: string): string {
  if (!isPlaceholder(countryCheckoutUrl)) return countryCheckoutUrl!.trim();
  if (!isPlaceholder(ENV_CHECKOUT)) return ENV_CHECKOUT!.trim();
  return "#";
}

/**
 * True only when a real checkout link exists. Used to decide whether to add
 * the `lemonsqueezy-button` class — without this, lemon.js would hijack the
 * click on a "#" button and try to open a checkout overlay for nothing.
 */
export function isCheckoutReady(countryCheckoutUrl?: string): boolean {
  return checkoutUrl(countryCheckoutUrl) !== "#";
}

/**
 * Homepage section anchors must be root-relative ("/#faq", not "#faq").
 * A bare fragment resolves against the CURRENT page, so from /privacy/ it
 * becomes /privacy/#faq and scrolls nowhere.
 */
export function homeAnchor(href: string): string {
  return href.startsWith("#") ? `/${href}` : href;
}
