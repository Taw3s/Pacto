// Deep typing/media checks against disposable loopback services only.
import crypto from "node:crypto";
import fs from "node:fs";
import { ANON, APP, SERVICE, SUPABASE, assert, launch, sql } from "./lib.mjs";
for (const target of [APP, SUPABASE]) assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(target).hostname), "LOCAL TARGETS ONLY");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST || "127.0.0.1"), "LOCAL DATABASE ONLY");
const tag = crypto.randomUUID(), password = crypto.randomUUID();
const groups = [crypto.randomUUID(), crypto.randomUUID()];
const codes = groups.map((_, i) => `D${i}${tag.replaceAll("-", "").slice(0, 6)}`.toUpperCase());
const users = [], paths = [], results = [];
const headers = token => ({ apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" });
const rest = (path, token, body, method = body === undefined ? "GET" : "POST") => fetch(`${SUPABASE}/rest/v1/${path}`, { method, headers: headers(token), body: body === undefined ? undefined : JSON.stringify(body), redirect: "error" });
async function check(name, run) {
  try { const detail = await run(); results.push({ name, status: "pass", detail }); console.log(`PASS ${name}${detail ? `: ${detail}` : ""}`); }
  catch (error) { results.push({ name, status: "fail", detail: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
function observe(name, detail) { results.push({ name, status: "observation", detail }); console.log(`INFO ${name}: ${detail}`); }
async function upload(user, name, data, extra = {}) {
  const path = `${user.group}/${user.id}/${name}`;
  const response = await fetch(`${SUPABASE}/storage/v1/object/media/${path}`, { method: "POST", headers: { ...headers(user.token), "content-type": "image/jpeg", ...extra }, body: data });
  if (response.ok && !paths.includes(path)) paths.push(path);
  return { response, path };
}
async function sign(user, path, expiresIn) {
  const response = await fetch(`${SUPABASE}/storage/v1/object/sign/media/${path}`, { method: "POST", headers: headers(user.token), body: JSON.stringify({ expiresIn }) });
  if (!response.ok) return { response };
  const body = await response.json();
  return { response, url: `${SUPABASE}/storage/v1${body.signedURL}` };
}
async function start(user, extra = {}) {
  return rest("rpc/start_typing_test", user.token, { p_device: "pc", p_mode: "text", p_text: "sql-o-que-e", ...extra });
}
const finish = (user, test, extra = {}) => rest("rpc/finish_typing_test", user.token, { p_test: test.test_id, p_correct: 80, p_typed: 80, p_words: 10, ...extra });
const browser = await launch();
try {
  sql(`insert into groups(id,name,invite_code) values ('${groups[0]}','Depth A','${codes[0]}'),('${groups[1]}','Depth B','${codes[1]}')`);
  for (let i = 0; i < 6; i++) {
    const groupIndex = i === 5 ? 1 : 0, email = `depth-${tag}-${i}@pacto.test`;
    const response = await fetch(`${SUPABASE}/auth/v1/admin/users`, { method: "POST", headers: headers(SERVICE), body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { invite_code: codes[groupIndex], display_name: `Depth ${i}` } }) });
    assert(response.ok, `create fixture ${response.status}`);
    users.push({ id: (await response.json()).id, email, group: groups[groupIndex] });
    const login = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(ANON), body: JSON.stringify({ email, password }) });
    assert(login.ok, `fixture login ${login.status}`);
    const tokens = await login.json(); Object.assign(users[i], { token: tokens.access_token, refresh: tokens.refresh_token });
  }
  const [owner, viewer, progressUser, lengthUser, fraudUser, outsider] = users;
  sql(`update groups set owner_id='${owner.id}' where id='${groups[0]}'; update groups set owner_id='${outsider.id}' where id='${groups[1]}'`);
  const starts = await Promise.all([start(progressUser), start(progressUser), start(lengthUser), start(lengthUser), start(fraudUser, { p_mode: "words", p_text: null })]);
  assert(starts.every(r => r.ok), "typing fixture start failed");
  const tests = (await Promise.all(starts.map(r => r.json()))).map(rows => rows[0]);
  const readyAt = Date.now() + Math.max(...tests.map(t => t.seconds)) * 1000 + 1000;
  const page = await browser.newPage();
  await page.goto(`${APP}/login`);
  const jpeg = Buffer.from(await page.evaluate(() => { const c = document.createElement("canvas"); c.width = c.height = 2; return c.toDataURL("image/jpeg").split(",")[1]; }), "base64");
  const owned = await upload(owner, "owner.jpg", jpeg), foreign = await upload(outsider, "foreign.jpg", jpeg);
  assert(owned.response.ok && foreign.response.ok, "photo fixtures missing");
  const link = await sign(viewer, owned.path, 3600);
  assert(link.url, "viewer could not sign fixture");
  const originalHash = crypto.createHash("sha256").update(jpeg).digest("hex");
  const samePhoto = async () => {
    const response = await fetch(link.url);
    return response.ok && crypto.createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex") === originalHash;
  };
  await check("authenticated upload cannot overwrite an existing proof", async () => {
    const attempt = await upload(owner, "owner.jpg", Buffer.from("replacement"), { "x-upsert": "true" });
    assert(!attempt.response.ok && await samePhoto(), "proof replaced through upsert");
  });
  await check("direct storage deletion cannot erase an immutable proof", async () => {
    await fetch(`${SUPABASE}/storage/v1/object/media`, { method: "DELETE", headers: headers(owner.token), body: JSON.stringify({ prefixes: [owned.path] }) });
    assert(await samePhoto(), "client deleted the proof");
  });
  await check("changing a signed link path cannot read another group's photo", async () => {
    const altered = new URL(link.url); altered.pathname = `/storage/v1/object/sign/media/${foreign.path}`;
    assert(!(await fetch(altered)).ok, "signed token accepted a different photo path");
  });
  await check("changing the signed expiry invalidates the signature", async () => {
    const altered = new URL(link.url), parts = altered.searchParams.get("token").split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    payload.exp += 86400;
    parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
    altered.searchParams.set("token", parts.join("."));
    assert(!(await fetch(altered)).ok, "modified expiration accepted");
  });
  await check("changing a signed token signature is rejected", async () => {
    const altered = new URL(link.url), parts = altered.searchParams.get("token").split(".");
    parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
    altered.searchParams.set("token", parts.join("."));
    assert(!(await fetch(altered)).ok, "modified signature accepted");
  });
  await check("signed photo links cannot be used as API authorization tokens", async () => {
    const token = new URL(link.url).searchParams.get("token");
    const response = await rest("members?select=*", token);
    assert(!response.ok || (await response.json()).length === 0, "storage token authorized database reads");
  });
  for (const duration of [7200, 365 * 86400]) {
    const longer = await sign(viewer, owned.path, duration);
    if (longer.url) {
      const payload = JSON.parse(Buffer.from(new URL(longer.url).searchParams.get("token").split(".")[1], "base64url").toString());
      const remaining = payload.exp - Math.floor(Date.now() / 1000);
      observe("Caller-chosen signed URL lifetime", `requested ${duration} seconds; accepted token has approximately ${remaining} seconds left`);
    } else observe("Caller-chosen signed URL lifetime", `requested ${duration} seconds; rejected with ${longer.response.status}`);
  }
  assert((await fetch(link.url)).ok, "signed photo fixture unavailable");
  observe("Anonymous bearer link", "a fresh unauthenticated HTTP client can download a valid signed URL; possession of the URL is authorization");
  const photoHeaders = await fetch(link.url, { method: "HEAD" });
  observe("Photo response cache", `Cache-Control: ${photoHeaders.headers.get("cache-control") || "not present"}`);

  await check("logout prevents reuse of its refresh token", async () => {
    const logout = await fetch(`${SUPABASE}/auth/v1/logout?scope=global`, { method: "POST", headers: headers(viewer.token) });
    assert(logout.ok, `logout ${logout.status}`);
    const refresh = await fetch(`${SUPABASE}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: headers(ANON), body: JSON.stringify({ refresh_token: viewer.refresh }) });
    assert(!refresh.ok, "logged-out refresh token accepted");
  });
  const afterLogout = await rest("members?select=user_id", viewer.token);
  observe("JWT after global logout", afterLogout.ok && (await afterLogout.json()).length > 0 ? "previous access JWT still reads current group until expiry; logout revoked refresh, not this access JWT" : "old access JWT no longer reads private data");
  await check("removal blocks the old JWT from reading its former group", async () => {
    const response = await rest("rpc/remove_member", owner.token, { p_user: viewer.id }); assert(response.ok, `remove ${response.status}`);
    const read = await rest(`members?group_id=eq.${owner.group}`, viewer.token);
    assert(!read.ok || (await read.json()).length === 0, "former group visible after removal");
  });
  await check("a removed viewer cannot issue new links to the former group", async () => {
    const response = await sign(viewer, owned.path, 3600); assert(!response.response.ok, "new signed link accepted after removal");
  });
  await check("joining another group does not restore access to the old group's photo", async () => {
    const joined = await rest("rpc/join_group", viewer.token, { p_code: codes[1], p_name: "Moved viewer" }); assert(joined.ok, `join ${joined.status}`);
    const old = await fetch(`${SUPABASE}/storage/v1/object/authenticated/media/${owned.path}`, { headers: headers(viewer.token) });
    const current = await fetch(`${SUPABASE}/storage/v1/object/authenticated/media/${foreign.path}`, { headers: headers(viewer.token) });
    assert(!old.ok && current.ok, `old photo ${old.status}, new photo ${current.status}`);
  });
  observe("Saved signed link after logout, removal and group change", (await fetch(link.url)).ok ? "still valid independently of the viewer's current session/group" : "no longer usable");

  await check("unknown text identifiers cannot create typing tests", async () => {
    const response = await start(lengthUser, { p_text: "invented-text-not-in-catalog" });
    assert(!response.ok, "server accepted an unknown text identifier");
  });
  await new Promise(resolve => setTimeout(resolve, Math.max(0, readyAt - Date.now())));
  await check("an older simultaneous attempt cannot rewind saved text progress", async () => {
    const first = await finish(progressUser, tests[0]); assert(first.ok, `first finish ${first.status}`);
    const second = await finish(progressUser, tests[1], { p_correct: 10, p_typed: 10, p_words: 1 });
    const words = Number(sql(`select words from typing_progress where user_id='${progressUser.id}' and text_id='sql-o-que-e'`));
    assert(!second.ok && words === 10, `stale finish ${second.status}; saved place became ${words} instead of 10`);
  });
  await check("forged text length cannot reset progress through modulo arithmetic", async () => {
    const response = await finish(lengthUser, tests[2], { p_text_words: 1 });
    assert(!response.ok, "client chose a one-word text length and reset progress");
  });
  await check("impossible word counts cannot advance text progress", async () => {
    const response = await finish(lengthUser, tests[3], { p_correct: 10, p_typed: 10, p_words: 10 });
    assert(!response.ok, "one completed word per character accepted, without room for separators");
  });
  await check("a plausible self-reported result still respects replay prevention", async () => {
    const response = await finish(fraudUser, tests[4], { p_correct: 300, p_typed: 300, p_words: 60 });
    assert(response.ok, `plausible finish ${response.status}`);
    const [result] = await response.json();
    observe("Typing fraud without physical input", `no keys were typed; after waiting the real duration the client obtained ${result.wpm} WPM from self-reported counts`);
    assert(!(await finish(fraudUser, tests[4])).ok, "finished attempt replay accepted");
  });
} finally {
  await browser.close();
  if (paths.length) await fetch(`${SUPABASE}/storage/v1/object/media`, { method: "DELETE", headers: headers(SERVICE), body: JSON.stringify({ prefixes: paths }) });
  sql(`delete from groups where id in ('${groups[0]}','${groups[1]}')`);
  for (const user of users) await fetch(`${SUPABASE}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: headers(SERVICE) });
  fs.writeFileSync("security-depth-results.json", JSON.stringify({ tag, results }, null, 2));
  console.log(`DEPTH: ${results.filter(r => r.status === "pass").length} passed, ${results.filter(r => r.status === "fail").length} failed, ${results.filter(r => r.status === "observation").length} observations`);
}
if (results.some(r => r.status === "fail")) process.exitCode = 1;
