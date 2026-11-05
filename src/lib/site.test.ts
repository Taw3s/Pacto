import { describe, expect, it } from "vitest";
import { safeNextPath } from "./site";

const ORIGIN = "https://pactus-rho.vercel.app";

describe("safeNextPath (post-login redirect)", () => {
  it("keeps internal paths", () => {
    expect(safeNextPath("/hoje", ORIGIN)).toBe("/hoje");
    expect(safeNextPath("/historico/abc?m=2026-10", ORIGIN)).toBe("/historico/abc?m=2026-10");
    expect(safeNextPath(null, ORIGIN)).toBe("/hoje");
  });

  it("never leaves the app origin", () => {
    for (const evil of [
      "//evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "https://evil.com/hoje",
      "http://pactus-rho.vercel.app/hoje",
      "https://pactus-rho.vercel.app.evil.com/",
      "javascript:alert(1)",
      " //evil.com",
      "/a/..//evil.com",
      "https://pactus-rho.vercel.app//evil.com",
    ]) {
      expect(safeNextPath(evil, ORIGIN), evil).toBe("/hoje");
    }
  });
});
