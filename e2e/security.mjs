// Controlled attacks against a disposable LOCAL stack. Never accepts a remote target.
import crypto from "node:crypto";
import { ANON, APP, SERVICE, SUPABASE, assert, launch, sql } from "./lib.mjs";

for (const value of [APP, SUPABASE]) {
  assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname), "security tests require loopback targets");
}
assert(process.env.CRON_SECRET, "set a local CRON_SECRET in both app and tests");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST || "127.0.0.1"), "local database required");
const id = crypto.randomUUID();
const groupA = crypto.randomUUID(), groupB = crypto.randomUUID();
const codeA = `A${id.replaceAll("-", "").slice(0, 7)}`.toUpperCase();
const codeB = `B${id.replaceAll("-", "").slice(0, 7)}`.toUpperCase();
const password = crypto.randomUUID();
const accounts = [];
const browser = await launch();
let passed = 0;
async function check(label, run) {
  await run();
  passed++;
  console.log(`PASS ${label}`);
}
async function auth(path, body, token = SERVICE) {
  return fetch(`${SUPABASE}/auth/v1/${path}`, {
    method: "POST", headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body), redirect: "error",
  });
}
async function rest(path, token, method = "GET", body) {
  return fetch(`${SUPABASE}/rest/v1/${path}`, {
    method, headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), redirect: "error",
  });
}
try {
  sql(`insert into groups(id,name,invite_code) values ('${groupA}','Security A','${codeA}'),('${groupB}','Security B','${codeB}')`);
  for (const [index, code] of [codeA, codeA, codeB].entries()) {
    const email = `security-${id}-${index}@pacto.test`;
    const response = await auth("admin/users", {
      email, password, email_confirm: true,
      user_metadata: { invite_code: code, display_name: index === 0 ? '<img src=x onerror=alert(1)>' : `Security ${index}` },
    });
    assert(response.ok, `fixture account creation: ${response.status}`);
    const user = await response.json();
    accounts.push({ id: user.id, email });
    const login = await auth("token?grant_type=password", { email, password }, ANON);
    assert(login.ok, `fixture login: ${login.status}`);
    accounts[index].token = (await login.json()).access_token;
  }
  const [owner, member, foreign] = accounts;
  const foreignPath = `${groupB}/${foreign.id}/security.jpg`;
  sql(`insert into storage.objects(bucket_id,name) values ('media','${foreignPath}');
    set request.jwt.claim.sub='${foreign.id}'; set role authenticated;
    insert into checkins(goal,photo_path,pages) values ('reading','${foreignPath}',10); reset role;`);
  const foreignCheckin = sql(`select id from checkins where user_id='${foreign.id}'`);
  assert(foreignCheckin, "foreign proof fixture exists");
  const page = await browser.newPage();
  let dialogs = 0;
  page.on("dialog", async dialog => { dialogs++; await dialog.dismiss(); });
  await page.goto(`${APP}/login`);
  await page.fill("#email", owner.email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/hoje");

  for (const cron of ["remind", "weekly"]) {
    for (const authorization of [undefined, "Bearer undefined", "Bearer wrong"]) {
      await check(`cron ${cron} refuses ${authorization ?? "missing authorization"}`, async () => {
        const response = await fetch(`${APP}/api/cron/${cron}`, { headers: authorization ? { authorization } : {}, redirect: "manual" });
        assert(response.status === 401, `expected 401, got ${response.status}`);
      });
    }
  }
  await check("stored HTML in a display name does not create executable elements", async () => {
    await page.getByText('<img src=x onerror=alert(1)>', { exact: false }).first().waitFor();
    assert(await page.locator('img[src="x"]').count() === 0 && dialogs === 0, "HTML executed");
  });
  for (const path of ["members", "groups", "checkins"]) {
    const filter = path === "groups" ? `id=eq.${groupB}` : `group_id=eq.${groupB}`;
    await check(`cross-group ${path} read is invisible`, async () => {
      const response = await rest(`${path}?${filter}`, owner.token);
      assert(response.ok && (await response.json()).length === 0, "foreign rows leaked");
    });
  }
  await check("non-owner cannot remove another member", async () => {
    const response = await rest("rpc/remove_member", member.token, "POST", { p_user: owner.id });
    assert(response.status >= 400, `removal accepted: ${response.status}`);
  });
  await check("review API refuses another group's existing proof", async () => {
    const response = await page.request.post(`${APP}/api/review`, { data: { checkinId: foreignCheckin } });
    assert(response.status() === 404, `foreign proof review returned ${response.status()}`);
  });
  await check("owner cannot remove a member from another group", async () => {
    const response = await rest("rpc/remove_member", owner.token, "POST", { p_user: foreign.id });
    assert(response.status >= 400, `foreign removal accepted: ${response.status}`);
    assert(sql(`select count(*) from members where user_id='${foreign.id}' and group_id='${groupB}'`) === "1", "foreign member changed");
  });
  for (const [rpc, body] of [
    ["_drop_member", { p_user: foreign.id, p_group: groupB }],
    ["claim_ai_review", { p_checkin: crypto.randomUUID(), p_user: owner.id }],
  ]) {
    await check(`client cannot call privileged ${rpc}`, async () => {
      const response = await rest(`rpc/${rpc}`, owner.token, "POST", body);
      assert(response.status >= 400, `privileged RPC accepted: ${response.status}`);
    });
  }
  for (const endpoint of ["membership", "review"]) {
    for (const body of ["null", "[]", "{"]) {
      await check(`${endpoint} rejects malformed body ${body}`, async () => {
        const response = await page.request.post(`${APP}/api/${endpoint}`, { data: body, headers: { "content-type": "application/json" } });
        assert(response.status() === 400, `expected 400, got ${response.status()}`);
      });
    }
  }
  await check("forged JWT does not reveal the group summary", async () => {
    const response = await fetch(`${APP}/api/group-summary`, { headers: { authorization: "Bearer forged-token" }, redirect: "manual" });
    assert([307, 401].includes(response.status), `unexpected status: ${response.status}`);
  });
  await check("upload into another member's folder is rejected", async () => {
    const response = await fetch(`${SUPABASE}/storage/v1/object/media/${groupB}/${foreign.id}/attack.jpg`, {
      method: "POST", headers: { apikey: ANON, authorization: `Bearer ${owner.token}`, "content-type": "image/jpeg" }, body: "local-test",
    });
    assert(response.status >= 400, `foreign upload accepted: ${response.status}`);
  });
  console.log(`SECURITY: ${passed} controlled checks passed`);
} finally {
  await browser.close();
  // Only the groups and accounts created by this invocation are removed.
  sql(`delete from groups where id in ('${groupA}','${groupB}')`);
  const foreign = accounts[2];
  if (foreign) {
    const response = await fetch(`${SUPABASE}/storage/v1/object/media`, {
      method: "DELETE", headers: { apikey: ANON, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [`${groupB}/${foreign.id}/security.jpg`] }),
    });
    assert(response.ok, `storage fixture cleanup failed: ${response.status}`);
  }
  for (const account of accounts) {
    const response = await fetch(`${SUPABASE}/auth/v1/admin/users/${account.id}`, {
      method: "DELETE", headers: { apikey: ANON, authorization: `Bearer ${SERVICE}` },
    });
    assert(response.ok, `fixture cleanup failed: ${response.status}`);
  }
}
