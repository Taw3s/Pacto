import { describe, expect, it } from "vitest";
import { authErrorPt } from "./auth-errors";

describe("authErrorPt", () => {
  it("translates the errors users actually hit", () => {
    expect(authErrorPt("User already registered")).toMatch(/já tem conta/);
    expect(authErrorPt("Error sending magic link email")).toMatch(/enviar o e-mail/);
    expect(authErrorPt("email rate limit exceeded")).toMatch(/Muitas tentativas/);
    expect(authErrorPt("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
    expect(authErrorPt("Signups not allowed for otp")).toMatch(/Não encontramos/);
  });
  it("never shows raw English for unknown errors", () => {
    expect(authErrorPt("Something odd")).toBe("Não foi possível continuar. Tente de novo.");
  });
});
