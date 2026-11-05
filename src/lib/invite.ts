// The challenge's invite link: /join?convite=CODE. It carries only the group's code (never an e-mail
// or a user id); the server checks the code exactly as when it is typed (check_invite_code, join_group).

export const INVITE_PARAM = "convite";

/** The code as the database stores it (upper case), or "" when it cannot be one (letters and digits, 6–32). */
export function normalizeInvite(raw: string | null | undefined): string {
  const code = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{6,32}$/.test(code) ? code : "";
}

export function inviteUrl(origin: string, code: string) {
  return `${origin}/join?${INVITE_PARAM}=${encodeURIComponent(code)}`;
}

/** Where someone signed in without a group finishes joining with this code (after Google or the login). */
export function joinStepPath(code: string) {
  return code ? `/join?step=code&${INVITE_PARAM}=${encodeURIComponent(code)}` : "/join?step=code";
}
