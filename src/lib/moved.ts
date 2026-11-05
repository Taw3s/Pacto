// The app moved from pactus-rho.vercel.app to its own domain (28/10/2026): where to tell people about it.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** Whether `host` is the old production address (not the new domain, not a preview, not a local run). */
export function oldAddress(host: string, site = SITE, env = process.env.NEXT_PUBLIC_VERCEL_ENV) {
  if (!site.startsWith("https://") || host === new URL(site).hostname || !host.endsWith(".vercel.app")) return false;
  // Production only: previews (branch or deployment URLs) keep working as test copies without the notice.
  if (env) return env === "production";
  return !host.includes("-git-") && !host.includes("-projects-");
}
