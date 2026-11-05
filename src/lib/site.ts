export function siteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function confirmUrl(next = "/hoje") {
  return `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

/** Resolves a post-login destination, accepting only paths on our own origin. */
export function safeNextPath(raw: string | null, origin: string, fallback = "/hoje"): string {
  if (!raw) return fallback;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== new URL(origin).origin) return fallback;
    const path = `${url.pathname}${url.search}`;
    // The caller resolves this path again: normalization can produce a leading //.
    if (new URL(path, origin).origin !== url.origin) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
