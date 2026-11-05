// Error reports (Sentry), shared by the browser, the server and the edge runtime. Only errors: no tracing, no
// session replay, no user data. Off unless NEXT_PUBLIC_SENTRY_DSN is set (set it only in Vercel's Production).
import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

/** Drops the query and the fragment: invite codes (?convite=) and login links travel there. */
export function stripQuery(url: string): string {
  return url.replace(/[?#].*$/, "");
}

/** Removes everything that points at a person before an event leaves the app. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.server_name;
  if (event.request) {
    const { url, method } = event.request;
    event.request = { method, url: url ? stripQuery(url) : undefined };
  }
  for (const crumb of event.breadcrumbs ?? []) scrubBreadcrumb(crumb);
  return event;
}

/** Console lines may print data; navigation and fetch crumbs keep only the path. */
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category === "console") return null;
  if (crumb.data) {
    for (const key of ["url", "from", "to"] as const) {
      const value = crumb.data[key];
      if (typeof value === "string") crumb.data[key] = stripQuery(value);
    }
  }
  return crumb;
}

// Integrations that measure use rather than errors: a session per page view (with the browser and an inferred IP),
// tracing headers on every request and Web Vitals. The privacy policy promises no behaviour analytics.
const USAGE_INTEGRATIONS = new Set(["BrowserSession", "BrowserTracing", "WebVitals", "SpanStreaming", "ConversationId"]);

export const sentryOptions = {
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || "development",
  // SDK 11 dropped sendDefaultPii and collects all of this by default: turn every item off explicitly.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  },
  integrations: <T extends { name: string }>(defaults: T[]) => defaults.filter((i) => !USAGE_INTEGRATIONS.has(i.name)),
  // Errors only: no performance tracing (tracesSampleRate left unset), no replay, no sessions.
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
};
