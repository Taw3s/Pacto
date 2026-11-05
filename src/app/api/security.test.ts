import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  session: vi.fn(),
  configured: vi.fn(),
  removeGroupMedia: vi.fn(),
  removeUserMedia: vi.fn(),
  retryPendingMediaCleanup: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.session }));
vi.mock("@/lib/gemini", () => ({ geminiConfigured: mocks.configured, askGemini: vi.fn() }));
vi.mock("@/lib/membership", () => mocks);
vi.mock("@/lib/push", () => ({ groupToday: vi.fn(), notifyOnce: vi.fn() }));
vi.mock("@/lib/media-retention", () => ({ trimOldPhotos: vi.fn() }));

import { GET as remind } from "./cron/remind/route";
import { GET as weekly } from "./cron/weekly/route";
import { POST as membership } from "./membership/route";
import { POST as review } from "./review/route";
import { DELETE as account } from "./account/route";
import { POST as progress } from "./progress/route";

describe.each([["membership", membership], ["review", review], ["account", account], ["progress", progress]] as const)("%s browser origin guard", (name, handler) => {
  it.each<Record<string, string>>([{ origin: "https://attacker.example" }, { "sec-fetch-site": "cross-site" }])("rejects hostile browser origin metadata before authentication", async headers => {
    const response = await handler(new NextRequest(`http://localhost/api/${name}`, { method: name === "account" ? "DELETE" : "POST", headers }));
    expect(response.status).toBe(403);
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockReturnValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe.each([["remind", remind], ["weekly", weekly]] as const)("cron %s authorization", (_, handler) => {
  it.each([undefined, "", "Bearer undefined", "Bearer null", "Bearer wrong"])("rejects %s before opening an admin client", async (authorization) => {
    vi.stubEnv("CRON_SECRET", "local-test-secret");
    const headers = new Headers();
    if (authorization !== undefined) headers.set("authorization", authorization);
    const response = await handler(new NextRequest("http://localhost/api/cron/test", { headers }));
    expect(response.status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("fails closed when the server secret is %s", async (secret) => {
    vi.stubEnv("CRON_SECRET", secret);
    const response = await handler(new NextRequest("http://localhost/api/cron/test", {
      headers: { authorization: `Bearer ${secret}` },
    }));
    expect(response.status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("accepts the matching secret and reaches the disabled-service check", async () => {
    vi.stubEnv("CRON_SECRET", "local-test-secret");
    const response = await handler(new NextRequest("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer local-test-secret" },
    }));
    expect(response.status).toBe(501);
    expect(mocks.admin).toHaveBeenCalledOnce();
  });
});

describe("API hostile request bodies", () => {
  it.each(["null", "[]", "1", '"text"', "{"])("membership rejects %s without querying the database", async (body) => {
    const from = vi.fn();
    mocks.session.mockResolvedValue({ auth: { getClaims: async () => ({ data: { claims: { sub: "test-user" } } }) }, from });
    const response = await membership(new Request("http://localhost/api/membership", { method: "POST", body }));
    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("membership refuses anonymous deletion requests", async () => {
    const from = vi.fn();
    mocks.session.mockResolvedValue({ auth: { getClaims: async () => ({ data: null }) }, from });
    const response = await membership(new Request("http://localhost/api/membership", { method: "POST", body: '{"action":"leave"}' }));
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it.each(["null", "[]", "{", '{"checkinId":[]}', '{"checkinId":{}}', '{"checkinId":"------------------------------------"}'])("review rejects %s before session queries or AI calls", async (body) => {
    mocks.admin.mockReturnValue({});
    mocks.configured.mockReturnValue(true);
    const response = await review(new NextRequest("http://localhost/api/review", { method: "POST", body }));
    expect(response.status).toBe(400);
    expect(mocks.session).not.toHaveBeenCalled();
  });
});
