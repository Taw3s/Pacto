import { describe, expect, it } from "vitest";
import { isPublicPath } from "./middleware";

describe("isPublicPath", () => {
  it("opens the presentation, the entry screens, the legal pages and the support page", () => {
    for (const p of ["/", "/login", "/join", "/auth/confirm", "/privacidade", "/termos", "/apoiar", "/api/cron/remind"]) expect(isPublicPath(p), p).toBe(true);
  });

  it("keeps every app screen and API private (making / public opens nothing below it)", () => {
    const privatePaths = ["/hoje", "/feed", "/ranking", "/dividas", "/historico/abc", "/checkin/abc", "/config", "/api/membership", "/api/account", "/api/review", "/api/group-summary"];
    for (const p of privatePaths) expect(isPublicPath(p), p).toBe(false);
  });

  it("matches whole segments only", () => {
    for (const p of ["/joinx", "/login-admin", "/termosx", "//hoje", "/api/cronjob"]) expect(isPublicPath(p), p).toBe(false);
  });
});
