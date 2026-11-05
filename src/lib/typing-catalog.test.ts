import fs from "node:fs";
import { expect, it } from "vitest";
import { TEXTS as portuguese } from "./typing-texts-pt";
import { TEXTS as english } from "./typing-texts-en";

it("server text lengths match all shipped texts in both languages", () => {
  const migration = fs.readFileSync(new URL("../../supabase/migrations/0022_typing_progress_integrity.sql", import.meta.url), "utf8");
  const actual = new Map([...migration.matchAll(/^  \('([^']+)', '(pt|en)', (\d+)\)[,;]$/gm)].map(match => [match[1], { lang: match[2], words: Number(match[3]) }]));
  const expected = new Map([...portuguese, ...english].map(text => [text.id, { lang: text.lang, words: text.text.split(/\s+/).filter(Boolean).length }]));
  expect(actual).toEqual(expected);
});
