import { describe, expect, it } from "vitest";
import { normalizeGitHubRepoUrl, validateAttachment } from "./attachments";

const bytes = (...values: number[]) => Uint8Array.from(values);

describe("study and project attachment validation", () => {
  it("accepts a bounded PDF with a PDF signature", () => {
    expect(validateAttachment("study_pdf", "aula.pdf", 1024, bytes(0x25, 0x50, 0x44, 0x46, 0x2d))).toEqual({ ok: true, contentType: "application/pdf", extension: "pdf" });
  });

  it("accepts supported ZIP signatures without extracting the archive", () => {
    expect(validateAttachment("project_zip", "codigo.ZIP", 1024, bytes(0x50, 0x4b, 0x03, 0x04)).ok).toBe(true);
    expect(validateAttachment("project_zip", "empty.zip", 22, bytes(0x50, 0x4b, 0x05, 0x06)).ok).toBe(true);
    expect(validateAttachment("project_zip", "spanned.zip", 8, bytes(0x50, 0x4b, 0x07, 0x08)).ok).toBe(true);
  });

  it("rejects mismatched types, spoofed extensions, empty files, and oversized files", () => {
    expect(validateAttachment("study_pdf", "aula.zip", 1024, bytes(0x25, 0x50, 0x44, 0x46, 0x2d)).ok).toBe(false);
    expect(validateAttachment("project_zip", "malware.exe", 1024, bytes(0x50, 0x4b, 0x03, 0x04)).ok).toBe(false);
    expect(validateAttachment("study_pdf", "empty.pdf", 0, bytes()).ok).toBe(false);
    expect(validateAttachment("project_zip", "large.zip", 10 * 1024 * 1024 + 1, bytes(0x50, 0x4b, 0x03, 0x04)).ok).toBe(false);
    expect(validateAttachment("study_pdf", "fake.pdf", 100, bytes(0x4d, 0x5a)).ok).toBe(false);
  });

  it("accepts only a direct HTTPS GitHub repository URL and canonicalizes it", () => {
    expect(normalizeGitHubRepoUrl(" https://github.com/Taw3s/pactus.git/ ")).toBe("https://github.com/Taw3s/pactus");
    expect(normalizeGitHubRepoUrl("http://github.com/Taw3s/pactus")).toBeNull();
    expect(normalizeGitHubRepoUrl("https://github.com.evil.test/Taw3s/pactus")).toBeNull();
    expect(normalizeGitHubRepoUrl("https://github.com@evil.test/Taw3s/pactus")).toBeNull();
    expect(normalizeGitHubRepoUrl("https://github.com/Taw3s/pactus?token=secret")).toBeNull();
    expect(normalizeGitHubRepoUrl("https://github.com/Taw3s")).toBeNull();
  });
});
