import { describe, expect, it } from "vitest";
import { inviteUrl, joinStepPath, normalizeInvite } from "./invite";

describe("invite link", () => {
  it("normalizes a code from the link like the database does (trim, upper case)", () => {
    expect(normalizeInvite(" pacto2026 ")).toBe("PACTO2026");
    expect(normalizeInvite("ABC123")).toBe("ABC123");
  });

  it("drops anything that cannot be a code instead of passing it on", () => {
    for (const bad of [null, undefined, "", "abc", "AB CD12", "PACTO-26", "<script>", "a".repeat(33)]) expect(normalizeInvite(bad)).toBe("");
  });

  it("builds the link and the after-login path with only the code", () => {
    expect(inviteUrl("https://pacto.app", "PACTO2026")).toBe("https://pacto.app/join?convite=PACTO2026");
    expect(joinStepPath("PACTO2026")).toBe("/join?step=code&convite=PACTO2026");
    expect(joinStepPath("")).toBe("/join?step=code");
  });
});
