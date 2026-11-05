// The project's donation page (Apoia-se). Set in the deployment's environment; while it is empty the links to /apoiar stay hidden
// and the page says plainly that there is nowhere to give yet.
const raw = process.env.NEXT_PUBLIC_SUPPORT_URL ?? "";
export const SUPPORT_URL = raw.startsWith("https://") ? raw : "";
