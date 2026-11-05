import { SENTRY_DSN } from "./sentry";

/** Reports an error caught by an error boundary; loads the SDK on demand and never throws. */
export function reportError(error: unknown) {
  if (!SENTRY_DSN) return;
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
}
