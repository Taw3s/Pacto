// Bound concurrency checks on a disposable local database only.
import crypto from "node:crypto";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { ANON, APP, SERVICE, SUPABASE, assert, sql } from "./lib.mjs";
for (const target of [APP, SUPABASE]) assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(target).hostname), "LOCAL TARGETS ONLY");
assert(["localhost", "127.0.0.1", "::1"].includes(process.env.PGHOST || "127.0.0.1"), "LOCAL DATABASE ONLY");
const groups = [], users = [], results = [], paths = [];
const headers = token => ({ apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" });
const rest = (route, token, body) => fetch(`${SUPABASE}/rest/v1/${route}`, { method: "POST", headers: headers(token), body: JSON.stringify(body), redirect: "error" });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function check(name, run) {
  try { const detail = await run(); results.push({ name, status: "pass", detail }); console.log(`PASS ${name}${detail ? `: ${detail}` : ""}`); }
  catch (error) { results.push({ name, status: "fail", detail: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}
async function makeGroup(count) {
  const group = crypto.randomUUID(), code = crypto.randomBytes(4).toString("hex").toUpperCase(); groups.push(group);
  sql(`insert into groups(id,name,invite_code) values ('${group}','Transactions','${code}')`);
  const members = [];
  for (let i = 0; i < count; i++) {
    const email = `transaction-${crypto.randomUUID()}@pacto.test`, password = crypto.randomUUID();
    const response = await fetch(`${SUPABASE}/auth/v1/admin/users`, { method: "POST", headers: headers(SERVICE), body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { invite_code: code, display_name: `Member ${i}` } }) });
    assert(response.ok, `create fixture ${response.status}`);
    const user = { id: (await response.json()).id, group }; users.push(user); members.push(user);
    const login = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(ANON), body: JSON.stringify({ email, password }) });
    assert(login.ok, `fixture login ${login.status}`); user.token = (await login.json()).access_token;
    sql(`update members set joined_on=sp_today()-${10 - i} where user_id='${user.id}'`);
  }
  sql(`update groups set owner_id='${members[0].id}' where id='${group}'`);
  return { group, members };
}
async function groupGate(group) {
  const child = spawn("psql", ["-X", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1"], {
    env: { ...process.env, PGHOST: "127.0.0.1", PGPORT: "54322", PGUSER: "postgres", PGPASSWORD: "postgres", PGDATABASE: "postgres" }, stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  const ready = new Promise((resolve, reject) => {
    child.stdout.on("data", bytes => { output += bytes.toString(); if (output.includes("GATE_READY")) resolve(); });
    child.on("error", reject); child.on("exit", code => { if (!output.includes("GATE_READY")) reject(new Error(`gate exited ${code}`)); });
  });
  child.stdin.write(`begin; select pg_advisory_xact_lock(hashtext('group:${group}'));\n\\echo GATE_READY\n`);
  await ready;
  return async () => {
    const exited = new Promise(resolve => child.once("exit", resolve));
    child.stdin.end("commit;\n\\q\n"); await exited;
  };
}
async function queued(name, count) {
  for (let i = 0; i < 150; i++) {
    const found = Number(sql(`select count(*) from pg_stat_activity where wait_event='advisory' and query like '%${name}%'`));
    if (found >= count) return;
    await wait(20);
  }
  throw new Error(`request did not wait at the ${name} gate`);
}
try {
  await check("a departed owner cannot remove the successor through a queued request", async () => {
    const { group, members: [owner, successor] } = await makeGroup(3);
    const release = await groupGate(group);
    let leaving, removing;
    try {
      leaving = rest("rpc/leave_group", owner.token, {});
      await queued("leave_group", 1);
      removing = rest("rpc/remove_member", owner.token, { p_user: successor.id });
      await queued("remove_member", 1);
    } finally { await release(); }
    const [leave, remove] = await Promise.all([leaving, removing]);
    assert(leave.ok, `owner leave ${leave.status}`);
    const retained = sql(`select count(*) from members where user_id='${successor.id}' and group_id='${group}'`);
    assert(!remove.ok && retained === "1", `queued remove ${remove.status}; successor membership count ${retained}`);
    assert(sql(`select owner_id from groups where id='${group}'`) === successor.id, "successor did not retain ownership");
  });
  await check("a burst of duplicate removals cannot all succeed against stale permissions", async () => {
    const { group, members: [owner, target] } = await makeGroup(3);
    const release = await groupGate(group), requests = [];
    try {
      for (let i = 0; i < 8; i++) requests.push(rest("rpc/remove_member", owner.token, { p_user: target.id }));
      await queued("remove_member", 8);
    } finally { await release(); }
    const replies = await Promise.all(requests), accepted = replies.filter(response => response.ok).length;
    assert(accepted === 1, `${accepted} duplicate removals accepted; expected one`);
    assert(sql(`select count(*) from members where group_id='${group}'`) === "2", "unexpected members removed");
  });
  await check("simultaneous study extras cannot exceed five sessions", async () => {
    const { group, members: [owner] } = await makeGroup(1);
    const proofPaths = Array.from({ length: 9 }, (_, i) => `${group}/${owner.id}/extra-${i}.jpg`); paths.push(...proofPaths);
    // Storage metadata is sufficient for this database quota fixture; no image analysis is requested.
    sql(`insert into storage.objects(bucket_id,name) values ${proofPaths.map(p => `('media','${p}')`).join(",")};
      create function public.security_pause_extra() returns trigger language plpgsql as $$ begin if new.extra and new.user_id='${owner.id}'::uuid then perform pg_sleep(0.3); end if; return new; end $$;
      create trigger zz_security_pause_extra before insert on checkins for each row execute function public.security_pause_extra();`);
    try {
      const first = await rest("checkins", owner.token, { goal: "study", minutes: 60, summary: "Estudei transacoes e concorrencia com exemplos locais seguros.", study_prompt: "explain", photo_path: proofPaths[0] });
      assert(first.ok, `main study proof ${first.status}`);
      await Promise.all(proofPaths.slice(1).map(photo_path => rest("checkins", owner.token, { goal: "study", minutes: 10, extra: true, photo_path })));
      const count = Number(sql(`select count(*) from checkins where user_id='${owner.id}' and extra and day=sp_today()`));
      assert(count === 5, `${count} extra sessions inserted; expected five`);
    } finally { sql("drop trigger if exists zz_security_pause_extra on checkins; drop function if exists public.security_pause_extra()"); }
  });
} finally {
  sql("drop trigger if exists zz_security_pause_extra on checkins; drop function if exists public.security_pause_extra()");
  if (paths.length) await fetch(`${SUPABASE}/storage/v1/object/media`, { method: "DELETE", headers: headers(SERVICE), body: JSON.stringify({ prefixes: paths }) });
  for (const group of groups) sql(`delete from groups where id='${group}'`);
  for (const user of users) await fetch(`${SUPABASE}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: headers(SERVICE) });
  fs.writeFileSync("security-transactions-results.json", JSON.stringify({ results }, null, 2));
  console.log(`TRANSACTIONS: ${results.filter(r => r.status === "pass").length} passed, ${results.filter(r => r.status === "fail").length} failed`);
}
if (results.some(r => r.status === "fail")) process.exitCode = 1;
