"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { MAX_ATTACHMENT_BYTES, validateAttachment, type AttachmentKind } from "@/lib/attachments";
import type { Goal } from "@/lib/types";

type SavedAttachment = { kind: AttachmentKind; display_name: string; size_bytes: number; expired: boolean; url: string | null };

const kindFor = (goal: Goal): AttachmentKind | null => goal === "study" ? "study_pdf" : goal === "project" ? "project_zip" : null;
export const attachmentSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
const ext = (kind: AttachmentKind) => (kind === "study_pdf" ? "PDF" : "ZIP");

/** Texts from the Astra brief of 03/11/2026 (block 1); shared with the proof form in TodayChecklist. */
export const attachmentCopy = {
  title: (kind: AttachmentKind) => (kind === "study_pdf" ? "Material estudado" : "Arquivo do projeto"),
  add: (kind: AttachmentKind) => `Adicionar ${ext(kind)}`,
  help: (kind: AttachmentKind) => `Um arquivo ${ext(kind)} de até 10 MB.`,
  wrongType: (kind: AttachmentKind) => `Escolha um arquivo ${ext(kind)}.`,
  tooBig: "O arquivo deve ter até 10 MB.",
};

export function CheckinAttachments({ checkinId, goal, canAdd, keepDays, attachments }: {
  checkinId: string;
  goal: Goal;
  /** The owner, while the proof is young enough to keep a file. */
  canAdd: boolean;
  keepDays: number;
  attachments: SavedAttachment[];
}) {
  const router = useRouter();
  const kind = kindFor(goal);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saved = attachments.find((item) => item.kind === kind);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    if (!next || !kind) return;
    const result = validateAttachment(kind, next.name, next.size, new Uint8Array(await next.slice(0, 8).arrayBuffer()));
    if (!result.ok) {
      setError(result.reason === "size" ? attachmentCopy.tooBig : attachmentCopy.wrongType(kind));
      setFile(null);
      return;
    }
    setFile(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || !kind || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`/api/checkins/${checkinId}/attachments`, { method: "POST", body: form });
      // 409: this proof already has its file (e.g. a retry after a lost answer): show what is stored.
      if (!response.ok && response.status !== 409) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Não foi possível enviar o arquivo. Tente novamente.");
      }
      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o arquivo. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  // Nothing to show to the group without a file; only the owner gets the form to add one later.
  if (!kind || (!saved && !canAdd)) return null;
  return (
    <section className="card mb-4" aria-labelledby="anexos-title" data-testid="checkin-attachments">
      <h2 id="anexos-title" className="mb-2 text-sm font-semibold leading-5">
        {attachmentCopy.title(kind)}
      </h2>
      {saved ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 break-all text-sm leading-5">
            {saved.display_name}
            <span className="block text-muted">
              {ext(kind)} · {attachmentSize(saved.size_bytes)}
            </span>
          </p>
          {saved.expired ? (
            <p className="text-sm leading-5 text-muted" data-testid="attachment-expired">
              Prova com mais de {keepDays} dias: o arquivo não fica mais guardado.
            </p>
          ) : saved.url ? (
            <a href={saved.url} download={saved.display_name} rel="noreferrer" className="btn-secondary min-h-11 shrink-0">
              <Download size={18} aria-hidden />
              Baixar {ext(kind)}
            </a>
          ) : (
            <p role="alert" className="text-sm text-fail">
              Não foi possível abrir o arquivo. Tente novamente.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <p id="anexo-ajuda" className="text-sm leading-5 text-muted">
            {attachmentCopy.help(kind)}
          </p>
          <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-sm border-2 border-dashed border-control px-3 py-2 text-sm font-semibold hover:bg-raised">
            <span className="min-w-0 break-all">{file ? file.name : attachmentCopy.add(kind)}</span>
            <input
              type="file"
              accept={kind === "study_pdf" ? ".pdf,application/pdf" : ".zip,application/zip"}
              onChange={choose}
              aria-describedby="anexo-ajuda"
              className="sr-only"
            />
          </label>
          {file && (
            <p className="text-sm leading-5 text-muted">
              Arquivo selecionado · {ext(kind)} · {attachmentSize(file.size)}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-fail">
              {error}
            </p>
          )}
          <p role="status" className="sr-only">
            {busy ? "Enviando arquivo…" : ""}
          </p>
          <button type="submit" className="btn-secondary w-full" disabled={!file || busy}>
            {busy ? "Enviando arquivo…" : "Enviar arquivo"}
          </button>
        </form>
      )}
    </section>
  );
}

export { MAX_ATTACHMENT_BYTES };
