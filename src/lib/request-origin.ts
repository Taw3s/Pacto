/** Cookie-authenticated mutations must not accept browser requests from another origin. */
export function trustedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin !== null) {
    const url = new URL(request.url);
    const first = (h: string) => request.headers.get(h)?.split(",")[0].trim();
    // The site's own origin, however the platform hands it over (the URL, or Host / X-Forwarded-* from the proxy).
    const proto = first("x-forwarded-proto") ? `${first("x-forwarded-proto")}:` : url.protocol;
    const hosts = [url.host, first("host"), first("x-forwarded-host")].filter(Boolean);
    return hosts.some((host) => origin === `${proto}//${host}` || origin === `${url.protocol}//${host}`);
  }
  // Non-browser clients may omit Origin. Browsers still identify cross-site requests here.
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
