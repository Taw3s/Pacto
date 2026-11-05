// The SDK is ~60 kB: load it after the page, and only when reports are on (Production with a DSN).
// An error in the first moments before it loads is not reported; that is the price of a light first load.
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry";

if (SENTRY_DSN) void import("@sentry/nextjs").then((Sentry) => Sentry.init(sentryOptions));
