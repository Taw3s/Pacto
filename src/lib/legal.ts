// Who answers for the app's personal data (LGPD). Set in the deployment's environment; until then the
// pages say plainly that the contact is missing instead of inventing one.
export const CONTROLLER_NAME = process.env.NEXT_PUBLIC_CONTROLLER_NAME || "a pessoa responsável pelo Pacto";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
export const LEGAL_UPDATED = "04/11/2026";
