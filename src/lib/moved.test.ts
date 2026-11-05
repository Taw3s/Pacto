import { describe, expect, it } from "vitest";
import { oldAddress } from "./moved";

const SITE = "https://www.pactus.dev.br";

describe("old address notice", () => {
  it("shows on the old production address", () => {
    expect(oldAddress("pactus-rho.vercel.app", SITE, "production")).toBe(true);
    expect(oldAddress("pactus-rho.vercel.app", SITE, undefined)).toBe(true);
  });
  it("never on the new domain, previews or local runs", () => {
    expect(oldAddress("www.pactus.dev.br", SITE, "production")).toBe(false);
    expect(oldAddress("pactus-git-feat-x-dantas-projects-509b70bb.vercel.app", SITE, "preview")).toBe(false);
    expect(oldAddress("pactus-git-feat-x-dantas-projects-509b70bb.vercel.app", SITE, undefined)).toBe(false);
    expect(oldAddress("localhost", SITE, undefined)).toBe(false);
  });
  it("stays off while the site URL is not the new https domain", () => {
    expect(oldAddress("pactus-rho.vercel.app", "http://localhost:3000", "production")).toBe(false);
    expect(oldAddress("pactus-rho.vercel.app", "https://pactus-rho.vercel.app", "production")).toBe(false);
  });
});
