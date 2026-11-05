// Real local Auth/REST/Storage; only the cookie adapter and a transport pause are injected.
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, expect, it, vi } from "vitest";
import { sql } from "./lib.mjs";
const shared = vi.hoisted(() => ({ caller: null as unknown as SupabaseClient, admin: null as unknown as SupabaseClient }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => shared.caller }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => shared.admin }));
import { POST } from "../src/app/api/membership/route";

const url = process.env.SUPABASE_URL!, anon = process.env.SUPABASE_ANON_KEY!, service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) throw new Error("LOCAL SUPABASE REQUIRED");
if (!["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST || "127.0.0.1")) throw new Error("LOCAL DATABASE REQUIRED");
shared.admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const groups: string[] = [], users: string[] = [], paths: string[] = [];
type User = { id: string; token: string };
async function fixture() {
  const group = crypto.randomUUID(), code = crypto.randomBytes(4).toString("hex").toUpperCase(); groups.push(group);
  sql(`insert into groups(id,name,invite_code) values ('${group}','Binding tests','${code}')`);
  const people: User[] = [];
  for (let i = 0; i < 2; i++) {
    const email = `binding-${crypto.randomUUID()}@pacto.test`, password = crypto.randomUUID();
    const created = await shared.admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { invite_code: code, display_name: `Binding ${i}` } });
    if (created.error || !created.data.user) throw new Error("fixture account creation failed");
    const id = created.data.user.id; users.push(id);
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await auth.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) throw new Error("fixture login failed");
    people.push({ id, token: login.data.session.access_token });
    const path = `${group}/${id}/private.jpg`; paths.push(path);
    const uploaded = await shared.admin.storage.from("media").upload(path, new Uint8Array([255, 216, 255, 217]), { contentType: "image/jpeg" });
    if (uploaded.error) throw new Error("fixture upload failed");
  }
  sql(`update groups set owner_id='${people[0].id}' where id='${group}'`);
  return { group, owner: people[0], member: people[1] };
}
async function caller(user: User, intercept?: typeof fetch) {
  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${user.token}` }, ...(intercept ? { fetch: intercept } : {}) }, auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await client.auth.getClaims(user.token);
  if (verified.error || verified.data?.claims.sub !== user.id) throw new Error("fixture JWT verification failed");
  vi.spyOn(client.auth, "getClaims").mockResolvedValue(verified);
  return client;
}
afterEach(async () => {
  vi.restoreAllMocks();
  if (paths.length) await shared.admin.storage.from("media").remove(paths.splice(0));
  for (const group of groups.splice(0)) sql(`delete from groups where id='${group}'`);
  for (const user of users.splice(0)) await shared.admin.auth.admin.deleteUser(user);
});

it("a group change between lookup and RPC cannot erase the previous group's photos", async () => {
  const { group, owner, member } = await fixture();
  const ownerPhoto = `${group}/${owner.id}/private.jpg`;
  const signed = await shared.admin.storage.from("media").createSignedUrl(ownerPhoto, 60);
  if (signed.error) throw new Error("fixture signing failed");
  const direct = await caller(member);
  let movedTo = "", paused = false;
  shared.caller = await caller(member, async (input, init) => {
    const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!paused && /\/rpc\/(leave_group|change_membership)$/.test(requestUrl)) {
      paused = true;
      const left = await direct.rpc("leave_group"); if (left.error) throw new Error("fixture leave failed");
      const created = await direct.rpc("create_group", { p_name: "New binding group", p_display_name: "Moved", p_items: ["coffee"] });
      if (created.error) throw new Error("fixture group change failed");
      movedTo = sql(`select group_id from members where user_id='${member.id}'`);
      if (!/^[0-9a-f-]{36}$/.test(movedTo)) throw new Error("fixture group lookup failed");
      groups.push(movedTo);
    }
    return fetch(input, init);
  });
  const response = await POST(new Request("http://localhost/api/membership", { method: "POST", headers: { "content-type": "application/json" }, body: '{"action":"leave"}' }));
  const remains = await fetch(signed.data.signedUrl);
  expect(paused).toBe(true);
  // Check the actual private object before checking the status, to expose destructive cleanup.
  expect(remains.ok, "the previous group's owner's photo was erased").toBe(true);
  expect(response.status).toBe(403);
  expect(sql(`select group_id from members where user_id='${member.id}'`)).toBe(movedTo);
});

it.each(["leave", "remove"])("normal %s removes only the authorized member's media", async action => {
  const { group, owner, member } = await fixture();
  shared.caller = await caller(action === "leave" ? member : owner);
  const response = await POST(new Request("http://localhost/api/membership", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, userId: member.id }) }));
  expect(response.status).toBe(200);
  expect(sql(`select count(*) from members where user_id='${member.id}'`)).toBe("0");
  const files = await shared.admin.storage.from("media").list(`${group}/${owner.id}`);
  expect(files.data?.some(file => file.name === "private.jpg")).toBe(true);
  const removed = await shared.admin.storage.from("media").list(`${group}/${member.id}`);
  expect(removed.data).toHaveLength(0);
});
