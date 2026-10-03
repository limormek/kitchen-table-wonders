/**
 * Campaign attribution that survives ad blockers.
 *
 * Amplitude records UTM tags itself (see `attribution` in analytics.ts), but
 * only when its script isn't blocked, and it never sees the sale, which
 * happens on Lemon Squeezy. So we also:
 *
 *   1. remember the last tagged link a visitor arrived through (30 days,
 *      first-party localStorage), and
 *   2. copy those tags onto every Lemon Squeezy checkout link as
 *      checkout[custom][utm_*], so each order carries "which friend / which
 *      creator" in its custom data (order webhook `meta.custom_data`).
 *
 * Values are sanitised to short slugs ([a-z0-9._-], max 64 chars), and any
 * query value containing "@" is removed from the URL before analytics loads,
 * so a malformed or malicious link can't smuggle an email or free text through.
 * Call this BEFORE initAnalytics().
 */

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type Attribution = Partial<Record<(typeof KEYS)[number], string>>;

const STORAGE_KEY = "ktw_attribution";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function clean(value: string | null): string | undefined {
  // Our links never contain "@"; a value that does is most likely an email.
  if (!value || value.includes("@")) return undefined;
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? slug.slice(0, 64) : undefined;
}

function fromUrl(): Attribution | undefined {
  const params = new URLSearchParams(location.search);
  const found: Attribution = {};
  for (const key of KEYS) {
    const value = clean(params.get(key));
    if (value) found[key] = value;
  }
  // utm_source is the one tag every link we build has; without it, ignore.
  return found.utm_source ? found : undefined;
}

function load(): Attribution | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const { at, tags } = JSON.parse(raw) as { at: number; tags: Attribution };
    if (Date.now() - at > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return tags;
  } catch {
    return undefined;
  }
}

function save(tags: Attribution): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), tags }));
  } catch {
    // Storage blocked (private mode, settings): this page's links still get tagged.
  }
}

/**
 * Drop any query parameter whose value looks like an email (contains "@")
 * from the address bar. Runs before Amplitude initialises, so neither its
 * UTM capture nor the page-URL properties on every event can see one.
 */
function stripEmailsFromUrl(): void {
  const url = new URL(location.href);
  let changed = false;
  for (const [key, value] of [...url.searchParams]) {
    if (value.includes("@")) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) history.replaceState(history.state, "", url);
}

/** Last touch wins: a new tagged link replaces whatever was stored. */
export function initAttribution(): void {
  stripEmailsFromUrl();
  const current = fromUrl();
  if (current) save(current);
  const tags = current ?? load();
  if (!tags) return;

  // lemon.js reads href at click time, so rewriting it here is enough for both
  // the overlay (desktop) and the same-tab hosted checkout (touch devices).
  document
    .querySelectorAll<HTMLAnchorElement>('a[href*=".lemonsqueezy.com/checkout/"]')
    .forEach((link) => {
      const url = new URL(link.href);
      for (const [key, value] of Object.entries(tags)) {
        url.searchParams.set(`checkout[custom][${key}]`, value);
      }
      link.href = url.toString();
    });
}
