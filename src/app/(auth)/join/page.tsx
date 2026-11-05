"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorPt } from "@/lib/auth-errors";
import { confirmUrl } from "@/lib/site";
import { AuthShell, Notice } from "@/components/AuthShell";
import { GoogleButton, googleEnabled } from "@/components/GoogleButton";
import { MenuPicker } from "@/components/MenuPicker";
import { DEFAULT_MENU, type DebtItem } from "@/lib/debt-items";
import { INVITE_PARAM, joinStepPath, normalizeInvite } from "@/lib/invite";

function JoinForm() {
  const router = useRouter();
  // step=code: already authenticated but without a group (e.g. account created without a valid code).
  const params = useSearchParams();
  const codeOnly = params.get("step") === "code";
  // criar=1: no invite, this person creates a challenge (signs up first, then names it on step=code).
  const [creating, setCreating] = useState(params.get("criar") === "1");
  const [groupName, setGroupName] = useState("");
  const [menu, setMenu] = useState<DebtItem[]>(DEFAULT_MENU);
  // ?convite=CODE (the invite link): the code comes filled in, and is still checked by the server.
  const invited = normalizeInvite(params.get(INVITE_PARAM));
  const [code, setCode] = useState(invited);
  const [inviteState, setInviteState] = useState<"" | "valid" | "invalid">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<"" | "confirm" | "magic">("");

  // Signed in but not in a group yet. Ask the server who this is: a session left over from a
  // deleted account still looks valid in the browser, so send it back to the login.
  // Otherwise suggest the name from the Google account.
  // An invite link opened while already signed in (no group yet): skip the sign-up, keep the code.
  useEffect(() => {
    if (!invited || codeOnly) return;
    createClient()
      .auth.getSession()
      .then(({ data }) => data.session && router.replace(joinStepPath(invited)));
  }, [invited, codeOnly, router]);

  // Say early whether the link's code exists (same check as on submit; a network failure says nothing).
  useEffect(() => {
    if (!invited) return;
    createClient()
      .rpc("check_invite_code", { p_code: invited })
      .then(({ data, error }) => !error && setInviteState(data ? "valid" : "invalid"));
  }, [invited]);

  useEffect(() => {
    if (!codeOnly) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data, error }) => {
      // Only a definite "this account/session does not exist" logs out (never a network hiccup).
      const gone = error && (["user_not_found", "session_not_found", "bad_jwt"].includes(error.code ?? "") || error.name === "AuthSessionMissingError");
      if (gone) {
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/login?error=session");
        return;
      }
      const meta = data.user?.user_metadata ?? {};
      const suggested = String(meta.full_name ?? meta.name ?? "").trim().split(/\s+/)[0] ?? "";
      if (suggested) setName((n) => n || suggested.slice(0, 40));
    });
  }, [codeOnly, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const invite = code.trim().toUpperCase();

    if (codeOnly && creating) {
      const { error } = await supabase.rpc("create_group", { p_name: groupName, p_display_name: name, p_items: menu });
      if (error?.message.includes("already a member")) {
        router.replace("/hoje");
        router.refresh();
        return;
      }
      if (error) {
        setError("Não foi possível criar o desafio. Tente de novo.");
        setBusy(false);
        return;
      }
      router.replace("/hoje");
      router.refresh();
      return;
    }

    if (codeOnly) {
      const { error } = await supabase.rpc("join_group", { p_code: invite, p_name: name });
      if (error?.message.includes("already a member")) {
        // Already in the group (e.g. joined in another tab): just go in.
        router.replace("/hoje");
        router.refresh();
        return;
      }
      if (error && (error.code === "23503" || error.message?.includes("not authenticated"))) {
        // The account behind this session no longer exists.
        await supabase.auth.signOut({ scope: "local" });
        router.replace("/login?error=session");
        return;
      }
      if (error) {
        setError(error.message?.includes("invalid") ? "Código de convite inválido." : "Não foi possível entrar no grupo. Tente de novo.");
        setBusy(false);
        return;
      }
      router.replace("/hoje");
      router.refresh();
      return;
    }

    if (!creating) {
      const { data: valid } = await supabase.rpc("check_invite_code", { p_code: invite });
      if (!valid) {
        setError("Código de convite inválido.");
        setBusy(false);
        return;
      }
    }

    // The invite code travels in the user metadata; a database trigger adds the member. Without a
    // code (creating a challenge) the account starts without a group and lands on step=code.
    const data = creating ? { display_name: name.trim() } : { invite_code: invite, display_name: name.trim() };
    const after = creating ? "/join?step=code&criar=1" : "/hoje";
    if (password) {
      const { data: res, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data, emailRedirectTo: confirmUrl(after) },
      });
      setBusy(false);
      if (error) return setError(authErrorPt(error.message));
      if (res.session) {
        router.replace(after);
        router.refresh();
      } else setSent("confirm");
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, data, emailRedirectTo: confirmUrl(after) },
      });
      setBusy(false);
      if (error) return setError(authErrorPt(error.message));
      setSent("magic");
    }
  }

  if (sent) {
    return (
      <Notice title="Confira seu e-mail">
        {sent === "confirm" ? "Confirme seu e-mail" : "Abra o link"} enviado para <b>{email}</b> para {creating ? "criar o seu desafio" : "terminar de entrar no grupo"}.
      </Notice>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {codeOnly ? (
        <p className="text-sm text-muted">
          {creating ? "Você entrou. Dê um nome ao desafio e escolha o que vale cada dia descumprido." : "Você entrou. Agora digite o código de convite do grupo."}
        </p>
      ) : (
        googleEnabled && (
          <>
            <GoogleButton next={creating ? undefined : joinStepPath(normalizeInvite(code) || invited)} />
            <p className="text-center text-sm text-muted">
              {!creating && (normalizeInvite(code) || invited) ? "Com o Google, o código vai junto." : "Com o Google, você digita o código depois."} Ou crie a
              conta com e-mail:
            </p>
          </>
        )
      )}
      {!creating && (
        <div>
          <label className="label" htmlFor="code">Código de convite</label>
          <input
            id="code"
            className="input uppercase tracking-widest"
            required
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-describedby={invited ? "invite-state" : undefined}
          />
          {invited && code.trim().toUpperCase() === invited && inviteState && (
            <p id="invite-state" className={`mt-1 text-sm ${inviteState === "valid" ? "text-muted" : "text-fail"}`} role="status">
              {inviteState === "valid" ? "Código do convite preenchido." : "Este convite não é válido. Confira o link ou peça um novo."}
            </p>
          )}
        </div>
      )}
      {creating && codeOnly && (
        <div>
          <label className="label" htmlFor="group">Nome do desafio</label>
          <input id="group" className="input" required maxLength={40} placeholder="Ex.: Pacto da turma" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="name">Seu nome</label>
        <input id="name" className="input" required maxLength={40} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {!codeOnly && (
        <>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha <span className="text-muted">(opcional; sem senha, você entra por link no e-mail)</span></label>
            <input id="password" className="input" type="password" minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </>
      )}
      {creating && codeOnly && (
        <fieldset>
          <legend className="label">O que vale cada dia descumprido</legend>
          <MenuPicker value={menu} onChange={setMenu} />
          <p className="mt-1 text-xs text-muted">Só você, como dono do desafio, poderá trocar depois; a troca vale a partir da segunda seguinte.</p>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="text-sm text-fail">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? (creating ? "Criando…" : "Entrando…") : creating ? (codeOnly ? "Criar desafio" : "Criar conta") : "Entrar no grupo"}
      </button>
      <p className="text-center text-sm text-muted">
        {creating ? "Recebeu um convite? " : "Não tem convite? "}
        <button type="button" className="inline-flex min-h-11 items-center font-semibold text-accent underline" onClick={() => (setCreating(!creating), setError(""))} data-testid="toggle-create">
          {creating ? "Entrar com um código" : "Criar um desafio"}
        </button>
      </p>
      {!codeOnly && (
        <p className="text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link
            href={!creating && (normalizeInvite(code) || invited) ? `/login?next=${encodeURIComponent(joinStepPath(normalizeInvite(code) || invited))}` : "/login"}
            className="inline-flex min-h-11 items-center font-semibold text-accent underline"
          >
            Fazer login
          </Link>
        </p>
      )}
    </form>
  );
}

export default function JoinPage() {
  return (
    <AuthShell subtitle="Entre com um convite ou crie o seu desafio">
      <Suspense>
        <JoinForm />
      </Suspense>
    </AuthShell>
  );
}
