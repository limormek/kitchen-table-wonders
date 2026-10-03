import * as amplitude from "@amplitude/analytics-browser";

/**
 * Privacy-first Amplitude setup for Kitchen Table Wonders.
 *
 * The rule for this file: Amplitude learns WHAT happened, never WHO it happened
 * to. We send event names and static, hand-written properties only. No email,
 * no name, no address, no form values, no user id, no IP.
 *
 * Deliberate choices:
 *   - trackingOptions is left at its defaults. Amplitude uses the request IP
 *     server-side to infer COARSE location (country / region / city) and then
 *     stores only a masked IP. We want the country breakdown, and an IP is not
 *     PII we are choosing to send from the client — it is inherent to any HTTP
 *     request. We never call identify()/setUserId(), so this geo data stays
 *     attached to the anonymous device id only.
 *   - autocapture: pageViews + sessions ONLY. elementInteractions and
 *     formInteractions are OFF because they scrape clicked-element text and
 *     form field metadata, which can sweep up typed values. We fire our own
 *     explicit events instead. fileDownloads is off too (nothing to download).
 *   - No identify(), no setUserId(), no user properties. Amplitude's anonymous
 *     device id is the only identifier.
 *   - No Session Replay and no plugins — nothing records screen content.
 *   - fetchRemoteConfig is OFF so the settings in this file are final. With it
 *     on, autocapture toggled in Amplitude's web UI would override them (e.g.
 *     silently re-enabling element-click capture).
 *   - The anonymous device id lives in a first-party cookie (AMP_<key prefix>,
 *     365 days), Amplitude's default, set explicitly here because the privacy
 *     policy describes it. A cookie on the top-level domain is shared by
 *     kitchentablewonders.com and www., which both serve the site; per-origin
 *     localStorage would count one visitor as two.
 */

const API_KEY = import.meta.env.PUBLIC_AMPLITUDE_API_KEY as string | undefined;

/**
 * Event properties MUST NEVER contain PII.
 * Allowed: static descriptors you typed yourself ("footer_signup", "hero").
 * Forbidden: anything read from an input, URL query, cookie or user record —
 * no email, name, address, phone, or free text a visitor typed.
 */
export type EventProps = Record<string, string | number | boolean>;

let ready = false;

/** Cheap belt-and-braces: drop anything that looks like an email address. */
function scrub(props?: EventProps): EventProps | undefined {
  if (!props) return undefined;
  const safe: EventProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string" && /@/.test(value)) {
      if (import.meta.env.DEV) {
        console.warn(`[analytics] dropped "${key}" — looks like PII, not sent.`);
      }
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

/** Fire an event. No-ops entirely unless Amplitude actually initialised. */
export function track(eventName: string, props?: EventProps): void {
  if (!ready) return;
  amplitude.track(eventName, scrub(props));
}

/** data-analytics-* attributes that name the event rather than describe it. */
const RESERVED = new Set(["analyticsEvent", "analyticsSubmit", "analyticsView"]);

/**
 * Every other data-analytics-* attribute on the element becomes one static
 * property: data-analytics-location="hero" → { location: "hero" }. These are
 * hand-written in markup, never read from user input.
 */
function staticProps(el: HTMLElement): EventProps | undefined {
  const props: EventProps = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (!key.startsWith("analytics") || RESERVED.has(key) || value === undefined) continue;
    const prop = key
      .slice("analytics".length)
      .replace(/^[A-Z]/, (c) => c.toLowerCase())
      .replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    props[prop] = value;
  }
  return Object.keys(props).length ? props : undefined;
}

/**
 * A click on a disclosure that is already open is a close, which we don't
 * count: <summary> inside an open <details>, or a button with
 * aria-expanded="true". Capture phase runs before the page's own toggle
 * handlers, so this reads the state from before the click.
 */
function isClosingClick(el: HTMLElement): boolean {
  if (el.tagName === "SUMMARY") return !!el.parentElement?.hasAttribute("open");
  return el.getAttribute("aria-expanded") === "true";
}

/**
 * Delegated listeners so new events are a markup change, not a code change:
 *   <a  data-analytics-event="cta_checkout">        → tracked on click
 *   <form data-analytics-submit="newsletter_submit"> → tracked on submit
 *   <section data-analytics-view="pricing">         → section_view, once per page
 * Any other data-analytics-* attribute adds one static property (see staticProps).
 * All listeners are passive observers — they never preventDefault, never read
 * field values, and never interfere with existing handlers.
 *
 * Inline scripts that can't import this module (e.g. the Kit form) report
 * outcomes with:
 *   document.dispatchEvent(new CustomEvent("analytics:track", { detail: { name, props } }))
 */
function wireDomEvents(): void {
  document.addEventListener(
    "click",
    (event) => {
      const el = (event.target as Element | null)?.closest?.("[data-analytics-event]");
      if (!(el instanceof HTMLElement)) return;
      const name = el.dataset.analyticsEvent;
      if (!name || isClosingClick(el)) return;
      track(name, staticProps(el));
    },
    { capture: true, passive: true },
  );

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const name = form.dataset.analyticsSubmit;
      if (!name) return;
      // Only the event name and static labels — never form field values.
      track(name, staticProps(form));
    },
    { capture: true, passive: true },
  );

  document.addEventListener("analytics:track", (event) => {
    const detail = (event as CustomEvent<{ name?: unknown; props?: EventProps }>).detail;
    if (typeof detail?.name === "string") track(detail.name, detail.props);
  });

  // "Did they reach it?": fires once per page load when a section crosses the
  // middle of the viewport, which works for sections taller than the screen.
  const sections = document.querySelectorAll<HTMLElement>("[data-analytics-view]");
  if (sections.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          track("section_view", { section: el.dataset.analyticsView ?? "", ...staticProps(el) });
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
  }
}

export function initAnalytics(): void {
  if (ready) return;
  // Never track from localhost or a dev build, and no-op safely if the key
  // has not been set in the environment.
  if (!import.meta.env.PROD) return;
  if (!API_KEY) return;

  amplitude.init(API_KEY, {
    // Keep in sync with the privacy policy's "How we use analytics" section.
    identityStorage: "cookie",
    fetchRemoteConfig: false,
    // trackingOptions left at defaults so Amplitude can infer coarse geo
    // (Country / Region / City) from the request IP. No geo is sent from the
    // client and the raw IP is not retained by Amplitude.
    autocapture: {
      pageViews: true,
      sessions: true,
      attribution: false,
      elementInteractions: false,
      formInteractions: false,
      fileDownloads: false,
    },
  });

  ready = true;
  wireDomEvents();
}
