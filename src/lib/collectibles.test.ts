import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { COLLECTIBLES, copies } from "./collectibles";

const ids = COLLECTIBLES.map((c) => c.id);
// Ids the database inserts (0006 + 0027), read from the migrations themselves.
const migrationIds = ["0006_chests_push.sql", "0027_collection_18.sql"].flatMap((f) => {
  const sql = fs.readFileSync(`supabase/migrations/${f}`, "utf8");
  const insert = sql.slice(sql.indexOf("insert into public.collectibles"), sql.indexOf(";", sql.indexOf("insert into public.collectibles")));
  return [...insert.matchAll(/\('(\w+)', '(comum|raro|lendario)'/g)].map((m) => ({ id: m[1], rarity: m[2] }));
});

describe("collection catalog", () => {
  it("has 18 unique objects, 6 per rarity", () => {
    expect(new Set(ids).size).toBe(18);
    for (const r of ["comum", "raro", "lendario"]) expect(COLLECTIBLES.filter((c) => c.rarity === r)).toHaveLength(6);
  });
  it("matches the ids and rarities stored by the migrations", () => {
    expect(migrationIds.map((m) => m.id).sort()).toEqual([...ids].sort());
    for (const m of migrationIds) expect(COLLECTIBLES.find((c) => c.id === m.id)?.rarity).toBe(m.rarity);
  });
  it("has a sprite, a name and a card line for every object", () => {
    for (const c of COLLECTIBLES) {
      expect(fs.existsSync(`public/lowpoly/${c.id}.png`), c.id).toBe(true);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.line.length).toBeGreaterThan(0);
    }
  });
  it("counts copies in Portuguese", () => {
    expect(copies(1)).toBe("1 cópia");
    expect(copies(3)).toBe("3 cópias");
  });
});
