// Bounded adversarial checks. All fixtures and requests must stay on loopback.
import crypto from "node:crypto";
import fs from "node:fs";
import { ANON, APP, SERVICE, SUPABASE, assert, launch, sql } from "./lib.mjs";

for (const target of [APP, SUPABASE]) assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(target).hostname), "LOCAL TARGETS ONLY");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST || "127.0.0.1"), "LOCAL DATABASE ONLY");
const tag = crypto.randomUUID();
const groups = [crypto.randomUUID(), crypto.randomUUID()];
const codes = groups.map((_, i) => `${i}${tag.replaceAll("-", "").slice(0, 7)}`.toUpperCase());
const password = crypto.randomUUID();
const users = [], paths = [], results = [];
const browser = await launch();
const headers = token => ({ apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" });
const rest = (path, token, body, method = body === undefined ? "GET" : "POST") => fetch(`${SUPABASE}/rest/v1/${path}`, { method, headers: headers(token), body: body === undefined ? undefined : JSON.stringify(body), redirect: "error" });
async function check(name, run) {
  try { const detail = await run(); results.push({ name, status: "pass", detail }); console.log(`PASS ${name}${detail ? `: ${detail}` : ""}`); }
  catch (error) { results.push({ name, status: "fail", detail: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
function observe(name, detail) { results.push({ name, status: "observation", detail }); console.log(`INFO ${name}: ${detail}`); }
async function session(user) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${APP}/login`);
  await page.fill("#email", user.email); await page.fill("#password", password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/hoje");
  return page;
}
async function upload(user, suffix, data, mime = "image/jpeg") {
  const path = `${user.group}/${user.id}/${suffix}`;
  const response = await fetch(`${SUPABASE}/storage/v1/object/media/${path}`, { method: "POST", headers: { ...headers(user.token), "content-type": mime }, body: data });
  if (response.ok) paths.push(path);
  return { response, path };
}
async function sign(user, path) {
  const response = await fetch(`${SUPABASE}/storage/v1/object/sign/media/${path}`, { method: "POST", headers: headers(user.token), body: JSON.stringify({ expiresIn: 3600 }) });
  assert(response.ok, `sign status ${response.status}`);
  const body = await response.json();
  return `${SUPABASE}/storage/v1${body.signedURL}`;
}
function seedCheckins(user, count) {
  const ids = Array.from({ length: count }, () => crypto.randomUUID());
  // Seed different historical days, not fabricated client permissions.
  sql(`alter table checkins disable trigger user;
    insert into checkins(id,user_id,group_id,day,goal,photo_path,pages)
    values ${ids.map((id, i) => `('${id}','${user.id}','${user.group}',sp_today()-${i + 1},'reading','${user.group}/${user.id}/seed-${i}.jpg',10)`).join(",")};
    alter table checkins enable trigger user;`);
  return ids;
}
try {
  sql(`insert into groups(id,name,invite_code) values ('${groups[0]}','Extended A','${codes[0]}'),('${groups[1]}','Extended B','${codes[1]}')`);
  for (let i = 0; i < 6; i++) {
    const email = `extended-${tag}-${i}@pacto.test`, groupIndex = i === 5 ? 1 : 0;
    const response = await fetch(`${SUPABASE}/auth/v1/admin/users`, { method: "POST", headers: headers(SERVICE), body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { invite_code: codes[groupIndex], display_name: `Extended ${i}` } }) });
    assert(response.ok, `create fixture ${response.status}`);
    const created = await response.json();
    users.push({ id: created.id, email, group: groups[groupIndex] });
    const login = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(ANON), body: JSON.stringify({ email, password }) });
    assert(login.ok, `login fixture ${login.status}`);
    const tokens = await login.json();
    Object.assign(users[i], { token: tokens.access_token, refresh: tokens.refresh_token });
  }
  const [owner, member, quota, typing, deleted, outsider] = users;
  sql(`update groups set owner_id='${owner.id}' where id='${owner.group}'; update groups set owner_id='${outsider.id}' where id='${outsider.group}'`);
  sql(`insert into debt_menus(group_id,effective_from,items) values ('${outsider.group}','2000-01-01',array['coffee'])`);
  const ownerPage = await session(owner), memberPage = await session(member), deletedPage = await session(deleted);
  const jpeg = Buffer.from(await ownerPage.evaluate(() => { const c = document.createElement("canvas"); c.width = c.height = 2; return c.toDataURL("image/jpeg").split(",")[1]; }), "base64");

  await check("concurrent typing starts respect three attempts per day", async () => {
    // Widen the real race with an INSERT-only test delay; do not alter authorization or counters.
    sql(`create function public.security_pause_typing() returns trigger language plpgsql as $$ begin if new.user_id='${typing.id}'::uuid then perform pg_sleep(0.3); end if; return new; end $$;
      create trigger security_pause_typing before insert on typing_tests for each row execute function public.security_pause_typing();`);
    try {
      await Promise.all(Array.from({ length: 8 }, () => rest("rpc/start_typing_test", typing.token, { p_device: "pc" })));
      const count = Number(sql(`select count(*) from typing_tests where user_id='${typing.id}' and day=sp_today()`));
      assert(count <= 3, `created ${count} attempts; limit is 3`);
      return `${count} attempts created`;
    } finally { sql("drop trigger if exists security_pause_typing on typing_tests; drop function if exists public.security_pause_typing()"); }
  });

  await check("concurrent reviews of different proofs respect daily AI quota", async () => {
    const ids = seedCheckins(quota, 9);
    sql(`insert into ai_review_attempts(checkin_id,user_id) select '${ids[0]}'::uuid,'${quota.id}'::uuid from generate_series(1,29);
      create function public.security_pause_ai() returns trigger language plpgsql as $$ begin if new.user_id='${quota.id}'::uuid then perform pg_sleep(0.3); end if; return new; end $$;
      create trigger security_pause_ai before insert on ai_review_attempts for each row execute function public.security_pause_ai();`);
    try {
      await Promise.all(ids.slice(1).map(id => rest("rpc/claim_ai_review", SERVICE, { p_checkin: id, p_user: quota.id })));
      const count = Number(sql(`select count(*) from ai_review_attempts where user_id='${quota.id}'`));
      assert(count <= 30, `created ${count} attempts; daily limit is 30`);
      return `${count} total attempts`;
    } finally { sql("drop trigger if exists security_pause_ai on ai_review_attempts; drop function if exists public.security_pause_ai()"); }
  });

  await check("concurrent requests for the same proof admit one AI attempt", async () => {
    const [id] = seedCheckins(owner, 1);
    const replies = await Promise.all(Array.from({ length: 8 }, () => rest("rpc/claim_ai_review", SERVICE, { p_checkin: id, p_user: owner.id })));
    assert(replies.every(r => r.ok), "RPC request failed");
    const values = await Promise.all(replies.map(r => r.json()));
    assert(values.filter(v => v === "ok").length === 1, "more than one review admitted");
  });
  await check("concurrent votes cannot give one member multiple votes", async () => {
    const proof = sql(`select id from checkins where user_id='${owner.id}' limit 1`);
    sql(`insert into checkin_reviews(checkin_id,group_id,verdict,seen,model) values ('${proof}','${owner.group}','mismatch','Local adversarial fixture','fixture')`);
    const dispute = sql(`select id from disputes where checkin_id='${proof}'`);
    assert(dispute, "dispute fixture missing");
    const replies = await Promise.all(Array.from({ length: 8 }, () => rest("dispute_votes", member.token, { dispute_id: dispute, upheld: true, reason: "Repeated controlled test vote" })));
    assert(replies.filter(r => r.ok).length === 1, "duplicate votes accepted");
    assert(sql(`select count(*) from dispute_votes where dispute_id='${dispute}' and voter_id='${member.id}'`) === "1", "duplicate vote rows");
    const outsiderVote = await rest("dispute_votes", outsider.token, { dispute_id: dispute, upheld: true, reason: "Foreign controlled test vote" });
    assert(!outsiderVote.ok, "foreign group member voted");
  });

  await check("concurrent chest opens cannot duplicate rewards", async () => {
    // Completed-day view is derived from three real goal rows; seed server fixtures only.
    sql(`alter table checkins disable trigger user;
      insert into checkins(user_id,group_id,day,goal,photo_path,summary,minutes,pages)
      values ('${owner.id}','${owner.group}',sp_today(),'study','x','${"a".repeat(45)}',60,null),
      ('${owner.id}','${owner.group}',sp_today(),'typing','y',null,null,null),
      ('${owner.id}','${owner.group}',sp_today(),'reading','z',null,null,10);
      alter table checkins enable trigger user;`);
    const replies = await Promise.all(Array.from({ length: 8 }, () => rest("rpc/open_chest", owner.token, { p_kind: "daily" })));
    assert(replies.every(r => r.ok), "chest RPC failed");
    const items = (await Promise.all(replies.map(r => r.json()))).map(rows => rows[0]?.item_id);
    assert(items[0] && new Set(items).size === 1, "inconsistent reward across requests");
    assert(sql(`select count(*) from chest_openings where user_id='${owner.id}' and kind='daily' and period=sp_today()`) === "1", "duplicated chest");
  });

  for (const [label, mime, data] of [
    ["HTML", "text/html", "<script>alert(1)</script>"], ["SVG", "image/svg+xml", '<svg onload="alert(1)"/>'],
    ["oversized JPEG", "image/jpeg", Buffer.alloc(5 * 1024 * 1024 + 1, 0)],
  ]) await check(`storage rejects ${label}`, async () => {
    const { response } = await upload(owner, `${crypto.randomUUID()}.jpg`, data, mime);
    assert(!response.ok, `upload accepted with ${response.status}`);
  });
  await check("spoofed JPEG content is not served as active HTML", async () => {
    const { response, path } = await upload(owner, "spoofed.jpg", "<script>alert(1)</script>");
    if (!response.ok) return "rejected at upload";
    const signed = await sign(owner, path);
    const download = await fetch(signed);
    assert(download.headers.get("content-type")?.startsWith("image/jpeg"), "active content MIME type");
    observe("MIME spoofing", "storage accepts invalid JPEG bytes; served as image/jpeg, not executable HTML");
  });
  await check("private storage has no anonymous public download", async () => {
    const { response, path } = await upload(owner, "private.jpg", jpeg);
    assert(response.ok, `fixture upload ${response.status}`);
    const download = await fetch(`${SUPABASE}/storage/v1/object/public/media/${path}`);
    assert(!download.ok, "private file became public");
  });
  await check("outsider cannot mint signed links to another group's media", async () => {
    const response = await fetch(`${SUPABASE}/storage/v1/object/sign/media/${owner.group}/${owner.id}/private.jpg`, { method: "POST", headers: headers(outsider.token), body: JSON.stringify({ expiresIn: 3600 }) });
    assert(!response.ok, "outsider signed a foreign photo");
  });
  for (const table of ["push_config", "notification_log", "ai_review_attempts", "media_cleanup_jobs"]) await check(`client cannot read ${table}`, async () => {
    const response = await rest(`${table}?select=*`, owner.token);
    assert(!response.ok, "privileged table readable");
  });
  for (const code of ["' OR '1'='1", "'); DROP TABLE groups; --", "", "\u0000"]) await check(`invite SQL injection payload ${JSON.stringify(code)} is not a valid invitation`, async () => {
    const response = await rest("rpc/check_invite_code", ANON, { p_code: code });
    assert(!response.ok || (await response.json()) === false, "malicious code matched a group");
  });
  for (const [table, body] of [
    ["checkin_reviews", { checkin_id: crypto.randomUUID(), group_id: owner.group, verdict: "match", seen: "forged", model: "fake" }],
    ["chest_openings", { user_id: owner.id, group_id: owner.group, kind: "daily", period: "2026-10-27", item_id: "crown" }],
    ["members", { user_id: owner.id, group_id: outsider.group }],
  ]) await check(`client cannot insert privileged ${table}`, async () => {
    const response = await rest(table, owner.token, body);
    assert(!response.ok, `privileged insert accepted: ${response.status}`);
  });
  await check("user cannot promote themself to group owner", async () => {
    const response = await rest(`groups?id=eq.${owner.group}`, member.token, { owner_id: member.id }, "PATCH");
    assert(!response.ok, "ownership update accepted");
    assert(sql(`select owner_id from groups where id='${owner.group}'`) === owner.id, "owner changed");
  });
  await check("debt menu RPC does not disclose another group's private menu", async () => {
    const day = sql("select sp_today()");
    const own = await rest("rpc/debt_items_on", outsider.token, { p_group: outsider.group, p_day: day });
    assert(own.ok && (await own.json()).includes("coffee"), "own group menu fixture is unreadable");
    const other = await rest("rpc/debt_items_on", owner.token, { p_group: outsider.group, p_day: day });
    assert(!other.ok || !(await other.json()).includes("coffee"), "foreign debt menu disclosed through privileged RPC");
  });

  const ownPhoto = await upload(owner, "remaining.jpg", jpeg);
  await check("authenticated pages cannot be embedded by another site", async () => {
    const response = await fetch(`${APP}/login`);
    const csp = response.headers.get("content-security-policy") || "";
    assert(/frame-ancestors\s+'none'/.test(csp) || response.headers.get("x-frame-options")?.toUpperCase() === "DENY", "no anti-framing protection");
    assert(response.headers.get("x-content-type-options") === "nosniff", "missing nosniff protection");
  });
  await check("a hostile same-site origin cannot remove a member through a plain HTML form", async () => {
    const attack = await ownerPage.context().newPage();
    try {
      await attack.route("http://localhost:3001/**", route => route.fulfill({ contentType: "text/html", body: "<form method='POST' enctype='text/plain'></form>" }));
      await attack.goto("http://localhost:3001/attack");
      await attack.evaluate(({ target, victim }) => {
        const form = document.querySelector("form");
        form.action = target;
        const input = document.createElement("input");
        input.name = `{"action":"remove","userId":"${victim}","padding":"`;
        input.value = '"}';
        form.append(input);
      }, { target: `${APP}/api/membership`, victim: typing.id });
      const navigation = attack.waitForNavigation();
      await attack.evaluate(() => document.querySelector("form").submit());
      const response = await navigation;
      assert(response?.status() === 403, `cross-origin form accepted: ${response?.status()}`);
      assert(sql(`select count(*) from members where user_id='${typing.id}'`) === "1", "CSRF removed the member");
    } finally { await attack.close(); }
  });
  const nestedPhoto = await upload(member, "nested/deeper/private.jpg", jpeg);
  const flatPhoto = await upload(member, "flat.jpg", jpeg);
  assert(ownPhoto.response.ok && flatPhoto.response.ok, "media fixtures missing");
  const savedGroupLink = await sign(member, ownPhoto.path);
  const savedFlatLink = await sign(member, flatPhoto.path);
  const savedNestedLink = nestedPhoto.response.ok ? await sign(member, nestedPhoto.path) : null;
  await check("owner can remove a member through the authenticated app", async () => {
    const response = await ownerPage.request.post(`${APP}/api/membership`, { data: { action: "remove", userId: member.id } });
    assert(response.ok(), `remove status ${response.status()}`);
  });
  for (const table of ["members", "groups", "checkins", "typing_tests", "chest_openings", "disputes", "payments"]) await check(`removed user's old JWT cannot read ${table}`, async () => {
    const response = await rest(`${table}?select=*`, member.token);
    assert(response.ok && (await response.json()).length === 0, "old JWT still reads group data");
  });
  await check("removed browser session cannot request group progress", async () => {
    const response = await memberPage.request.post(`${APP}/api/progress`);
    assert(response.status() === 403, `expected 403, got ${response.status()}`);
  });
  await check("removed member cannot mint new photo links", async () => {
    const response = await fetch(`${SUPABASE}/storage/v1/object/sign/media/${ownPhoto.path}`, { method: "POST", headers: headers(member.token), body: JSON.stringify({ expiresIn: 3600 }) });
    assert(!response.ok, "removed member minted a new link");
  });
  await check("removal erases a member's flat photo and invalidates its saved link", async () => {
    const response = await fetch(savedFlatLink);
    assert(!response.ok, "removed member photo still downloads");
  });
  await check("removal erases nested photos and invalidates their saved links", async () => {
    if (!savedNestedLink) return "nested upload rejected";
    const response = await fetch(savedNestedLink);
    assert(!response.ok, "nested private photo still downloads after removal");
  });
  const oldLinkResponse = await fetch(savedGroupLink);
  observe("Previously issued link to a remaining member's photo", oldLinkResponse.ok ? "still works after viewer removal until its signed expiry (one hour in the app)" : `revoked: ${oldLinkResponse.status}`);

  await check("account deletion revokes refresh and group access", async () => {
    const response = await deletedPage.request.delete(`${APP}/api/account`);
    assert(response.ok(), `delete status ${response.status()}`);
    const read = await rest("members?select=*", deleted.token);
    assert(!read.ok || (await read.json()).length === 0, "deleted user reads private data");
    const refresh = await fetch(`${SUPABASE}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: headers(ANON), body: JSON.stringify({ refresh_token: deleted.refresh }) });
    assert(!refresh.ok, "deleted account refreshes token");
    deleted.deleted = true;
  });
  await check("typing completion is timed and cannot be replayed", async () => {
    const started = await rest("rpc/start_typing_test", quota.token, { p_device: "pc" });
    assert(started.ok, `typing start ${started.status}`);
    const [test] = await started.json();
    // The UI suite can configure shorter local minutes; keep a plausible 60 WPM.
    const counts = { p_correct: test.seconds * 5, p_typed: test.seconds * 5, p_words: test.seconds };
    const early = await rest("rpc/finish_typing_test", quota.token, { p_test: test.test_id, p_correct: 300, p_typed: 300, p_words: 60 });
    assert(!early.ok, "instant finish accepted");
    const foreign = await rest("rpc/finish_typing_test", outsider.token, { p_test: test.test_id, p_correct: 300, p_typed: 300, p_words: 60 });
    assert(!foreign.ok, "foreign user completed another user's test");
    // Wait the real server-issued duration: no database clock manipulation.
    await new Promise(resolve => setTimeout(resolve, test.seconds * 1000));
    const reported = await rest("rpc/finish_typing_test", quota.token, { p_test: test.test_id, ...counts });
    assert(reported.ok, `timed finish ${reported.status}${reported.ok ? "" : `: ${await reported.text()}`}`);
    observe("Typing integrity boundary", "after waiting the required duration, a client can self-report plausible counts without typing; server does not attest physical keystrokes");
    const replay = await rest("rpc/finish_typing_test", quota.token, { p_test: test.test_id, p_correct: 300, p_typed: 300, p_words: 60 });
    assert(!replay.ok, "finished test replay accepted");
  });
  await check("cron retries persisted cleanup after membership has already disappeared", async () => {
    const photo = await upload(outsider, "retry/nested/private.jpg", jpeg);
    assert(photo.response.ok, "retry photo fixture missing");
    const savedLink = await sign(outsider, photo.path);
    const left = await rest("rpc/leave_group", outsider.token, {});
    assert(left.ok, `leave group ${left.status}`);
    const prefix = `${outsider.group}/${outsider.id}`;
    assert(sql(`select count(*) from media_cleanup_jobs where prefix='${prefix}'`) === "1", "cleanup was not persisted");
    const cron = await fetch(`${APP}/api/cron/remind`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    assert(cron.ok, `cleanup cron ${cron.status}`);
    assert(sql(`select count(*) from media_cleanup_jobs where prefix='${prefix}'`) === "0", "cleanup job not completed");
    assert(!(await fetch(savedLink)).ok, "queued private photo still downloads");
  });
} finally {
  await browser.close();
  sql("drop trigger if exists security_pause_typing on typing_tests; drop function if exists public.security_pause_typing(); drop trigger if exists security_pause_ai on ai_review_attempts; drop function if exists public.security_pause_ai()");
  if (paths.length) await fetch(`${SUPABASE}/storage/v1/object/media`, { method: "DELETE", headers: headers(SERVICE), body: JSON.stringify({ prefixes: paths }) });
  sql(`delete from groups where id in ('${groups[0]}','${groups[1]}')`);
  for (const user of users.filter(u => !u.deleted)) await fetch(`${SUPABASE}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: headers(SERVICE) });
  fs.writeFileSync("security-extended-results.json", JSON.stringify({ tag, results }, null, 2));
  console.log(`EXTENDED: ${results.filter(r => r.status === "pass").length} passed, ${results.filter(r => r.status === "fail").length} failed, ${results.filter(r => r.status === "observation").length} observations`);
}
if (results.some(r => r.status === "fail")) process.exitCode = 1;
