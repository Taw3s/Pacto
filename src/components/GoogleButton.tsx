"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmUrl } from "@/lib/site";

/** Shown only once Google sign-in is configured in Supabase (see README, "Login com Google"). */
export const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1";

/**
 * "Entrar com Google". Google only proves who the person is: someone without a group lands on
 * /join?step=code and still needs an invite code to get in.
 */
/** `next`: where to land after Google (e.g. the join step with an invite code); defaults to Hoje. */
export function GoogleButton({ next = "/hoje" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: confirmUrl(next), queryParams: { prompt: "select_account" } },
    });
    // On success the browser is already leaving for Google.
    if (error) {
      setBusy(false);
      setError("Não foi possível abrir o login do Google. Tente de novo ou entre com e-mail.");
    }
  }

  return (
    <div>
      <button type="button" className="btn-secondary w-full" onClick={go} disabled={busy} data-testid="google-login">
        <GoogleMark />
        {busy ? "Abrindo o Google…" : "Entrar com Google"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-fail">
          {error}
        </p>
      )}
    </div>
  );
}

/** Google's "G" (brand colours), as required next to the button text. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width={18} height={18} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
