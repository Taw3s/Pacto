import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, stripQuery } from "./sentry";

describe("error reports carry no personal data", () => {
  it("drops query and fragment (invite codes, login links)", () => {
    expect(stripQuery("https://www.pactus.dev.br/join?convite=ABC123")).toBe("https://www.pactus.dev.br/join");
    expect(stripQuery("/auth/callback#access_token=x")).toBe("/auth/callback");
    expect(stripQuery("/hoje")).toBe("/hoje");
  });

  it("removes the user, cookies, headers and the server name", () => {
    const event = {
      type: undefined,
      user: { id: "u1", email: "a@b.c", ip_address: "1.2.3.4" },
      server_name: "host",
      request: { url: "https://x/join?convite=ABC", method: "GET", cookies: { sb: "token" }, headers: { cookie: "sb=token" }, query_string: "convite=ABC" },
      breadcrumbs: [{ category: "navigation", data: { from: "/join?convite=ABC", to: "/hoje?primeiros=1" } }],
    } as unknown as ErrorEvent;
    const out = scrubEvent(event);
    expect(out.user).toBeUndefined();
    expect(out.server_name).toBeUndefined();
    expect(out.request).toEqual({ method: "GET", url: "https://x/join" });
    expect(out.breadcrumbs?.[0].data).toEqual({ from: "/join", to: "/hoje" });
  });

  it("drops console breadcrumbs and strips fetch urls", () => {
    expect(scrubBreadcrumb({ category: "console", message: "a@b.c" })).toBeNull();
    expect(scrubBreadcrumb({ category: "fetch", data: { url: "/api/x?token=1", method: "POST" } })?.data).toEqual({ url: "/api/x", method: "POST" });
  });
});
