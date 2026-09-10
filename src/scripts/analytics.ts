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

/**
 * Delegated listeners so new events are a markup change, not a code change:
 *   <a  data-analytics-event="cta_checkout">        → tracked on click
 *   <form data-analytics-submit="newsletter_submit"> → tracked on submit
 * An optional data-analytics-location adds one static property.
 * Both listeners are passive observers — they never preventDefault, never read
 * field values, and never interfere with existing handlers.
 */
function wireDomEvents(): void {
  document.addEventListener(
    "click",
    (event) => {
      const el = (event.target as Element | null)?.closest?.("[data-analytics-event]");
      if (!(el instanceof HTMLElement)) return;
      const name = el.dataset.analyticsEvent;
      if (!name) return;
      const location = el.dataset.analyticsLocation;
      track(name, location ? { location } : undefined);
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
      const location = form.dataset.analyticsLocation;
      // Only the event name and a static label — never form field values.
      track(name, location ? { location } : undefined);
    },
    { capture: true, passive: true },
  );
}

export function initAnalytics(): void {
  if (ready) return;
  // Never track from localhost or a dev build, and no-op safely if the key
  // has not been set in the environment.
  if (!import.meta.env.PROD) return;
  if (!API_KEY) return;

  amplitude.init(API_KEY, {
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
