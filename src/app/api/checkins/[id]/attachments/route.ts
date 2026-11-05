import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { trustedMutationOrigin } from "@/lib/request-origin";
import { validateAttachment } from "@/lib/attachments";
import { addDays, spToday } from "@/lib/dates";
import { KEEP_FULL_DAYS } from "@/lib/media-retention";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!trustedMutationOrigin(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Prova inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  const { data: checkin } = await supabase.from("checkins").select("id,user_id,group_id,goal,day").eq("id", id).maybeSingle();
  if (!checkin) return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
  if (checkin.user_id !== userId) return NextResponse.json({ error: "Só quem enviou a prova pode anexar arquivos." }, { status: 403 });
  const kind = checkin.goal === "study" ? "study_pdf" : checkin.goal === "project" ? "project_zip" : null;
  if (!kind) return NextResponse.json({ error: "Anexos só são aceitos em provas de estudo e projeto." }, { status: 400 });
  // Past the retention limit the cron would delete it the next night (media-retention.ts).
  if (checkin.day < addDays(spToday(), -KEEP_FULL_DAYS)) {
    return NextResponse.json({ error: `Provas com mais de ${KEEP_FULL_DAYS} dias não recebem arquivos.` }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  const candidate = form?.get("file");
  if (!(candidate instanceof File)) return NextResponse.json({ error: "Escolha um arquivo para anexar." }, { status: 400 });
  const validation = validateAttachment(kind, candidate.name, candidate.size, new Uint8Array(await candidate.slice(0, 8).arrayBuffer()));
  if (!validation.ok) {
    const message = validation.reason === "size" ? "O arquivo deve ter até 10 MB." : validation.reason === "type" ? "Use um arquivo PDF ou ZIP, conforme o tipo da prova." : "O conteúdo do arquivo não corresponde à extensão escolhida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Envio de anexos indisponível." }, { status: 503 });
  const baseName = candidate.name.split(/[\\/]/).at(-1) ?? "";
  const displayName = baseName.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120) || `arquivo.${validation.extension}`;
  const path = `${checkin.group_id}/${userId}/${checkin.id}/${randomUUID()}.${validation.extension}`;
  const bytes = new Uint8Array(await candidate.arrayBuffer());
  if (bytes.byteLength !== candidate.size) return NextResponse.json({ error: "Não foi possível ler o arquivo." }, { status: 400 });

  const { error: uploadError } = await admin.storage.from("attachments").upload(path, bytes, {
    contentType: validation.contentType,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: "Não foi possível guardar o anexo." }, { status: 502 });

  const { error: insertError } = await admin.from("checkin_attachments").insert({
    checkin_id: checkin.id,
    group_id: checkin.group_id,
    user_id: userId,
    kind,
    storage_path: path,
    display_name: displayName,
    size_bytes: candidate.size,
  });
  if (insertError) {
    await admin.storage.from("attachments").remove([path]).catch(() => null);
    if (insertError.code === "23505") return NextResponse.json({ error: "Esta prova já tem um anexo desse tipo." }, { status: 409 });
    console.error("checkin attachment metadata insert failed");
    return NextResponse.json({ error: "Não foi possível vincular o anexo à prova." }, { status: 500 });
  }
  return NextResponse.json({ attachment: { kind, display_name: displayName } }, { status: 201 });
}
