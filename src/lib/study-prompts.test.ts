import { describe, expect, it } from "vitest";
import { promptOfDay, STUDY_PROMPTS, studyPrompt } from "./study-prompts";

describe("study prompts", () => {
  it("ids are unique and fit the database check", () => {
    const ids = STUDY_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
  });
  it("the same person gets the same question all day, and the questions vary", () => {
    const user = "00000000-0000-0000-0000-000000000001";
    expect(promptOfDay(user, "2026-10-27")).toBe(promptOfDay(user, "2026-10-27"));
    const days = Array.from({ length: 30 }, (_, n) => promptOfDay(user, `2026-11-${String(n + 1).padStart(2, "0")}`).id);
    expect(new Set(days).size).toBeGreaterThan(5);
  });
  it("finds a question by id, and nothing for unknown ids", () => {
    expect(studyPrompt("hard")?.text).toContain("mais difícil");
    expect(studyPrompt("nope")).toBeNull();
    expect(studyPrompt(null)).toBeNull();
  });
});
