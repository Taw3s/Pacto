import { NextResponse, type NextRequest } from "next/server";
import { trustedMutationOrigin } from "@/lib/request-origin";
import { buildPrompt, decideVerdict, parseAnswer } from "@/lib/ai-review";
import { addDays, spToday } from "@/lib/dates";
import { askGemini, geminiConfigured } from "@/lib/gemini";
import { studyPrompt } from "@/lib/study-prompts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Checkin } from "@/lib/types";
import { DEVICE_LABEL, typingLabel } from "@/lib/typing";

export const maxDuration = 60;

// Reviews the photos of one check-in with Gemini. Any member of the group may trigger it
// (idempotent: an existing review is kept). Without the keys the feature is simply off.
// Every Gemini call is claimed first (claim_ai_review, migration 0014): one at a time per proof,
// 3 attempts per proof and 30 per member a day, so failures and bursts cannot drain the quota.
export async function POST(request: NextRequest) {
  if (!trustedMutationOrigin(request)) return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  const admin = createAdminClient();
  if (!admin || !geminiConfigured()) return NextResponse.json({ status: "disabled" }, { status: 501 });

  const body = await request.json().catch(() => null);
  const checkinId = body && typeof body === "object" && !Array.isArray(body) ? body.checkinId : undefined;
  if (typeof checkinId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkinId)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  // Read through the caller's session: RLS guarantees the check-in belongs to their group.
  const supabase = await createClient();
  const { data: checkin } = await supabase.from("checkins").select("*").eq("id", checkinId).maybeSingle<Checkin>();
  if (!checkin) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: existing } = await admin.from("checkin_reviews").select("checkin_id").eq("checkin_id", checkinId).maybeSingle();
  if (existing) return NextResponse.json({ status: "exists" });

  // Typing made in the app: the server measured it, so the judge only records the result.
  if (checkin.typing_test_id) {
    const { data: t } = await admin.from("typing_tests").select("wpm, accuracy, device, minutes").eq("id", checkin.typing_test_id).maybeSingle();
    if (!t) return NextResponse.json({ error: "test not found" }, { status: 404 });
    const { error } = await admin.from("checkin_reviews").insert({
      checkin_id: checkin.id,
      group_id: checkin.group_id,
      verdict: "match",
      seen: `Teste de digitação feito no app: ${typingLabel(t)} (${DEVICE_LABEL[t.device as "pc" | "mobile"]}).`,
      detected: Math.round(Number(t.wpm)),
      model: "pacto-app",
    });
    if (error && error.code !== "23505") return NextResponse.json({ error: "review failed" }, { status: 502 });
    return NextResponse.json({ status: "reviewed" });
  }

  // Same window as the tribunal and the proof page: a mismatch on an older proof would open a late tribunal (0026 refuses it too).
  if (checkin.day < addDays(spToday(), -1)) return NextResponse.json({ status: "closed" }, { status: 409 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: claim, error: claimError } = await admin.rpc("claim_ai_review", { p_checkin: checkin.id, p_user: user.id });
  if (claimError) return NextResponse.json({ error: "review failed" }, { status: 502 });
  if (claim === "exists") return NextResponse.json({ status: "exists" });
  if (claim === "busy") return NextResponse.json({ status: "busy" }, { status: 409 });
  if (claim !== "ok") return NextResponse.json({ status: claim }, { status: 429 });

  // The main photo is required; an extra one that fails to download is just left out.
  const files = await Promise.all([checkin.photo_path, ...(checkin.extra_photos ?? [])].map((p) => admin.storage.from("media").download(p)));
  if (files[0].error || !files[0].data) return NextResponse.json({ error: "photo unavailable" }, { status: 502 });
  const jpegs = await Promise.all(files.filter((f) => !f.error && f.data).map((f) => f.data!.arrayBuffer()));

  try {
    const { text, model } = await askGemini(buildPrompt(checkin, jpegs.length), jpegs);
    const answer = parseAnswer(text);
    if (!answer) throw new Error("unparseable answer");
    const { error } = await admin.from("checkin_reviews").insert({
      checkin_id: checkin.id,
      group_id: checkin.group_id,
      verdict: decideVerdict(checkin, answer),
      seen: answer.seen,
      detected: answer.number,
      // Only a summary that answers a question is rated (the model may fill the field anyway).
      ...(answer.answer && checkin.summary && studyPrompt(checkin.study_prompt) ? { answer_check: answer.answer } : {}),
      model,
    });
    if (error && error.code !== "23505") throw new Error(error.message);
    return NextResponse.json({ status: "reviewed" });
  } catch (e) {
    console.error("AI review failed", checkinId, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "review failed" }, { status: 502 });
  }
}
