import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
vi.mock("web-push", () => ({ default: { generateRequestDetails: vi.fn(({ endpoint }) => ({ endpoint, method: "POST", headers: {}, body: Buffer.from("test") })) } }));
import { notifyOnce } from "./push";

const fetchMock = vi.fn();
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", fetchMock); fetchMock.mockResolvedValue({ ok: true }); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function client(endpoint: string): SupabaseClient {
  return { from: (table: string) => {
    if (table === "push_subscriptions") return { select: () => ({ in: async () => ({ data: [{ id: "s", user_id: "u", endpoint, p256dh: "test", auth: "test" }] }) }) };
    if (table === "notification_log") return { upsert: () => ({ select: async () => ({ data: [{ user_id: "u" }], error: null }) }) };
    return { select: () => ({ maybeSingle: async () => ({ data: { public_key: "test", private_key: "test" } }) }) };
  } } as unknown as SupabaseClient;
}
async function send(endpoint: string) {
  return notifyOnce(client(endpoint), ["u"], "test", "2026-10-27", () => ({ title: "Test", body: "Test", url: "/hoje" }));
}
describe("push SSRF protection", () => {
  it.each([
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1:1234/admin",
    "https://attacker.example/",
    "https://fcm.googleapis.com.attacker.example/",
    "https://fcm.googleapis.com@127.0.0.1/admin",
    "file:///etc/passwd",
  ])("refuses %s without making a request", async endpoint => {
    expect(await send(endpoint)).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not follow redirects from an allowed service", async () => {
    await send("https://fcm.googleapis.com/fcm/send/test");
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: "error" }));
  });
  it("refuses loopback in a deployed site even if the test flag was accidentally enabled", async () => {
    vi.stubEnv("PUSH_TEST_SERVICE", "1"); vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pactus.example");
    expect(await send("http://127.0.0.1:1234/admin")).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("supports the explicitly configured local fake push service", async () => {
    vi.stubEnv("PUSH_TEST_SERVICE", "1"); vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(await send("http://127.0.0.1:54500/test")).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
