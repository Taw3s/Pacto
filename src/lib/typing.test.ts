import { describe, expect, it } from "vitest";
import { countRun, makeWords } from "./typing";

describe("countRun", () => {
  const target = ["casa", "livro", "café", "mesa"];
  it("counts exact words plus their space; a wrong word types but scores nothing", () => {
    expect(countRun(target, ["casa", "livor"], "")).toEqual({ correct: 5, typed: 11 });
  });
  it("the word in progress counts up to where it matches", () => {
    expect(countRun(target, ["casa"], "liv")).toEqual({ correct: 8, typed: 8 });
    expect(countRun(target, ["casa"], "lix")).toEqual({ correct: 5, typed: 8 });
  });
  it("accents must match", () => {
    expect(countRun(target, ["casa", "livro", "cafe"], "")).toEqual({ correct: 11, typed: 16 });
  });
});

describe("makeWords", () => {
  it("gives the requested number of non-empty words", () => {
    const w = makeWords(50);
    expect(w).toHaveLength(50);
    expect(w.every((x) => x.length > 0)).toBe(true);
  });

  it("gives English words without accents in English", () => {
    const w = makeWords(200, Math.random, "en");
    expect(w.every((x) => /^[a-z]+$/.test(x))).toBe(true);
  });
});
