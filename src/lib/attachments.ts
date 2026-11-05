export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type AttachmentKind = "study_pdf" | "project_zip";

type ValidAttachment = {
  ok: true;
  contentType: "application/pdf" | "application/zip";
  extension: "pdf" | "zip";
};

type InvalidAttachment = { ok: false; reason: "type" | "size" | "signature" };

/** Validate the filename, bound and file signature; never trust a browser MIME type. */
export function validateAttachment(kind: AttachmentKind, name: string, size: number, header: Uint8Array): ValidAttachment | InvalidAttachment {
  const extension = name.split(".").at(-1)?.toLowerCase();
  const expected = kind === "study_pdf" ? "pdf" : "zip";
  if (!name || extension !== expected) return { ok: false, reason: "type" };
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES) return { ok: false, reason: "size" };

  const pdf = kind === "study_pdf" && header.length >= 5 && header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46 && header[4] === 0x2d;
  const zip = kind === "project_zip" && header.length >= 4 && header[0] === 0x50 && header[1] === 0x4b &&
    ((header[2] === 0x03 && header[3] === 0x04) || (header[2] === 0x05 && header[3] === 0x06) || (header[2] === 0x07 && header[3] === 0x08));
  if (!pdf && !zip) return { ok: false, reason: "signature" };
  return { ok: true, extension: expected, contentType: kind === "study_pdf" ? "application/pdf" : "application/zip" };
}

/** Return a canonical GitHub repository URL, or null for anything outside that exact origin/path. */
export function normalizeGitHubRepoUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 250) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash) return null;
  const path = url.pathname.split("/").filter(Boolean);
  if (path.length !== 2) return null;
  const [owner, rawRepo] = path;
  const repo = rawRepo.replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo) || repo === "." || repo === "..") return null;
  return `https://github.com/${owner}/${repo}`;
}
