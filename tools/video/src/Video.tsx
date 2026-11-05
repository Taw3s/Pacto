// The presentation video, as approved by Astra (brief of 28/10/2026): 43 s with the support card (Apoia-se, 16:9)
// and 38 s without it (WhatsApp, 9:16). Each format is laid out on its own, never cropped from the other.
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Between, Brand, C, Card, Format, PIXEL, Shot, StepIn, Text, blocks, fit, judgeScale, shotMeta, sized, whole, useFonts, type Box, type ShotId } from "./parts";

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
// Scene starts in seconds (the brief's table).
const T = { room: 0, proof: 4, goals: 8, court: 18, debt: 25, end: 32, support: 38, total: 43 };
export const DURATION = { support: s(T.total), plain: s(T.support) };

export function Presentation({ format, support }: { format: Format; support: boolean }) {
  useFonts();
  const scene = (from: number, to: number, el: React.ReactNode) => (
    <Sequence from={s(from)} durationInFrames={s(to - from)}>
      {el}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {scene(T.room, T.proof, <Room f={format} step="agree" />)}
      {scene(T.proof, T.goals, <Room f={format} step="proof" />)}
      {scene(T.goals, T.court, <Goals f={format} />)}
      {scene(T.court, T.debt, <Court f={format} />)}
      {scene(T.debt, T.end, <Debt f={format} />)}
      {scene(T.end, T.support, <Room f={format} step="end" />)}
      {support && scene(T.support, T.total, <Support f={format} />)}
    </AbsoluteFill>
  );
}

function useLayout(f: Format) {
  const { width: W, height: H } = useVideoConfig();
  // Side margin, and the text column of the horizontal layout (left of the picture).
  const m = f === "h" ? 120 : 96;
  return { W, H, m };
}

/** Scenes 1, 2 and 6: the judge's room of the presentation page, with the brand. */
function Room({ f, step }: { f: Format; step: "agree" | "proof" | "end" }) {
  const { W, H, m } = useLayout(f);
  const id: ShotId = f === "h" ? "room-desktop" : "room-phone";
  const k = judgeScale(id, 192);
  const { w, h } = sized(whole(id), k);
  const x = f === "h" ? W - m - w : Math.round((W - w) / 2);
  const y = f === "h" ? Math.round((H - h) / 2) + 40 : 760;
  const textW = f === "h" ? x - 2 * m : W - 2 * m;
  const judge = step === "proof" ? { action: "think" as const } : { action: "idle" as const, start: s(1.2) };
  return (
    <AbsoluteFill>
      <Brand x={m} y={f === "h" ? 96 : 140} />
      {/* scene 2: the folder is off the bench at first and steps onto it */}
      <Shot id={id} scale={k} x={x} y={y} judge={judge} folder={{ start: step === "proof" ? s(1) : -99 }} />
      {step === "agree" && (
        <Text f={f} x={m} y={f === "h" ? 400 : 420} w={textW}>
          Seu grupo combina. Todo mundo cumpre.
        </Text>
      )}
      {step === "proof" && (
        <Text f={f} x={m} y={f === "h" ? 400 : 420} w={textW}>
          No Pacto, compromisso vem com prova.
        </Text>
      )}
      {step === "end" && (
        <>
          <Text f={f} x={m} y={f === "h" ? 360 : 400} w={textW}>
            Crie um desafio ou entre com um convite.
          </Text>
          <Text f={f} kind="address" color={C.accent} x={m} y={f === "h" ? 600 : 620} w={textW}>
            pactus.dev.br
          </Text>
        </>
      )}
    </AbsoluteFill>
  );
}

const GOALS = ["study", "typing", "reading"] as const;
const LABEL = { study: "Estudo", typing: "Digitação", reading: "Leitura" };
const proofId = (g: (typeof GOALS)[number]) => `proof-${g}` as const;

/**
 * Scene 3: one proof at a time (Astra, round 5): who and what was declared, then the evidence, at reading size;
 * then the day's seal (the judge stamps the three together).
 */
function Goals({ f }: { f: Format }) {
  const turns = [0, s(2.2), s(4.4)];
  const seal = s(6.5);
  return (
    <AbsoluteFill>
      {GOALS.map((g, i) => (
        <Between key={g} from={turns[i]} to={turns[i + 1] ?? seal}>
          <Proof f={f} goal={g} start={turns[i]} />
        </Between>
      ))}
      <Between from={seal}>
        <Seal f={f} />
      </Between>
    </AbsoluteFill>
  );
}

function Proof({ f, goal, start }: { f: Format; goal: (typeof GOALS)[number]; start: number }) {
  const { W, m } = useLayout(f);
  const id = proofId(goal);
  const p = shotMeta(id).parts as unknown as Record<"header" | "informed" | "evidence", Box>;
  // Header and "Informado" read as one block: from the top of the header (with its folder tab) to the bottom of the box.
  const who: Box = { x: p.header.x - 8, y: p.header.y - 12, w: p.header.w + 16, h: p.informed.y + p.informed.h - p.header.y + 20 };
  const ev: Box = { x: p.evidence.x - 4, y: p.evidence.y - 4, w: p.evidence.w + 8, h: p.evidence.h + 8 };
  if (f === "h") {
    // Inside x120/y260, 1680×680: the declaration on the left, the evidence on the right.
    const box = { x: m, y: 260, w: 1680, h: 680 };
    const kWho = fit(who, 760, box.h);
    const kEv = fit(ev, box.w - 760 - 64, box.h);
    const evSize = sized(ev, kEv);
    return (
      <>
        {/* The three goals in one line; the one being shown in yellow. */}
        <Text f="h" x={m} y={88} w={W - 2 * m}>
          {GOALS.map((g) => (
            <span key={g} style={{ color: g === goal ? C.accent : C.fg }}>
              {LABEL[g]}.{" "}
            </span>
          ))}
        </Text>
        <StepIn start={start}>
          <Shot id={id} scale={kWho} crop={who} x={box.x} y={box.y} />
          <Shot id={id} scale={kEv} crop={ev} x={box.x + box.w - evSize.w} y={box.y + (box.h - evSize.h) / 2} />
        </StepIn>
      </>
    );
  }
  // Vertical: title, the active label, then the declaration and the evidence stacked, ending before y1740.
  const w = 748;
  const kWho = w / who.w;
  const whoSize = sized(who, kWho);
  const evTop = 470 + whoSize.h + 24;
  const kEv = fit(ev, w, 1740 - evTop);
  const evSize = sized(ev, kEv);
  return (
    <>
      <Text f="v" x={m} y={140} w={W - 2 * m}>
        Estudo. Digitação. Leitura.
      </Text>
      <span style={{ position: "absolute", left: m, top: 340, fontFamily: PIXEL, fontSize: 48, lineHeight: "56px", color: C.accent, textTransform: "uppercase" }}>
        {LABEL[goal]}
      </span>
      <StepIn start={start}>
        <Shot id={id} scale={kWho} crop={who} x={(W - whoSize.w) / 2} y={470} />
        <Shot id={id} scale={kEv} crop={ev} x={(W - evSize.w) / 2} y={evTop} />
      </StepIn>
    </>
  );
}

function Seal({ f }: { f: Format }) {
  const { W, H, m } = useLayout(f);
  const id = "today-verified";
  const k = judgeScale(id, 192);
  const { w, h } = sized(whole(id), k);
  const pad = Math.round(8 * k);
  const x = (W - w) / 2;
  const y = f === "h" ? (H - h) / 2 - 60 : 700;
  return (
    <>
      {/* on the app it sits in a card: the panel keeps its colour around the screenshot */}
      <Card x={x - pad} y={y - pad} w={w + 2 * pad} h={h + 2 * pad} scale={k} />
      <Shot id={id} scale={k} x={x} y={y} judge={{ action: "stamp", start: s(0.3) }} />
      <Text f={f} kind="deadline" x={m} y={f === "h" ? 820 : 1200} w={W - 2 * m} align="center">
        Até 23:59 · horário de São Paulo
      </Text>
    </>
  );
}

/** Scene 4: another proof goes to the tribunal. The judge presents it; people vote; the gavel only after the result. */
function Court({ f }: { f: Format }) {
  const { W, H, m } = useLayout(f);
  const states = [
    { id: "tribunal-open", from: 0 },
    { id: "tribunal-vote1", from: s(2.4) },
    { id: "tribunal-verdict", from: s(4.4) },
  ] as const;
  // The courtroom is tall, so its blocks are laid out apart: the bench (with the judge), the parties with the proof,
  // and the score with the jury (plus the verdict at the end). The viewer's own vote buttons are left out.
  const k = judgeScale("tribunal-open", 144);
  const n = (id: ShotId) => shotMeta(id).parts!.blocks!.length;
  const parts = (id: ShotId) => {
    const verdict = id === "tribunal-verdict";
    return { bench: blocks(id, 0, 0), parties: blocks(id, 2, 2), jury: blocks(id, 3, n(id) - (verdict ? 1 : 2)) };
  };
  const p0 = parts("tribunal-verdict");
  const top = f === "h" ? 270 : 330;
  const col = sized(p0.bench, k).w;
  const gap = f === "h" ? Math.floor((W - 2 * m - 3 * col) / 2) : 24;
  // Vertical: bench and parties side by side would not fit, so the parties and the jury stack under the bench.
  const kV = f === "v" ? fit({ x: 0, y: 0, w: p0.parties.w, h: p0.parties.h + p0.jury.h }, W - 2 * m, H - top - sized(p0.bench, k).h - 2 * gap - 80) : k;
  const at = {
    bench: f === "h" ? { x: m, y: top } : { x: (W - col) / 2, y: top },
    parties: f === "h" ? { x: m + col + gap, y: top } : { x: (W - sized(p0.parties, kV).w) / 2, y: top + sized(p0.bench, k).h + gap },
    jury: f === "h" ? { x: m + 2 * (col + gap), y: top } : { x: (W - sized(p0.jury, kV).w) / 2, y: top + sized(p0.bench, k).h + sized(p0.parties, kV).h + 2 * gap },
  };
  return (
    <AbsoluteFill>
      <Text f={f} x={m} y={f === "h" ? 88 : 140} w={W - 2 * m}>
        A IA confere. O grupo decide.
      </Text>
      {states.map((st, i) => {
        const p = parts(st.id);
        const verdict = st.id === "tribunal-verdict";
        return (
          <Between key={st.id} from={st.from} to={states[i + 1]?.from}>
            <Shot id={st.id} scale={k} crop={p.bench} {...at.bench} judge={verdict ? { action: "gavel", start: st.from + s(0.3) } : { action: "present", start: i === 0 ? s(0.3) : -999 }} />
            <Shot id={st.id} scale={kV} crop={p.parties} {...at.parties} />
            <Shot id={st.id} scale={kV} crop={p.jury} {...at.jury} />
          </Between>
        );
      })}
    </AbsoluteFill>
  );
}

/** Scene 5: Bruno's debt, pending; one item is registered as received and only it becomes a receipt. */
function Debt({ f }: { f: Format }) {
  const { W, H, m } = useLayout(f);
  const paid = s(3.6);
  const area = f === "h" ? { x: W / 2, y: 80, w: W / 2 - m, h: H - 160 } : { x: m, y: 700, w: W - 2 * m, h: H - 700 - 100 };
  const k = Math.min(fit(whole("debt-received"), area.w, area.h), fit(whole("debt-pending"), area.w, area.h));
  const textW = f === "h" ? area.x - 2 * m : W - 2 * m;
  const at = (id: ShotId) => ({ x: area.x + (area.w - sized(whole(id), k).w) / 2, y: f === "h" ? (H - sized(whole(id), k).h) / 2 : area.y });
  return (
    <AbsoluteFill>
      <Between to={paid}>
        <Shot id="debt-pending" scale={k} {...at("debt-pending")} />
        <Text f={f} x={m} y={f === "h" ? 330 : 140} w={textW}>
          Não cumpriu? Deve o combinado ao grupo.
        </Text>
      </Between>
      <Between from={paid}>
        <Shot id="debt-received" scale={k} {...at("debt-received")} />
        <Text f={f} x={m} y={f === "h" ? 330 : 140} w={textW}>
          Recebeu? Registre no app.
        </Text>
      </Between>
      <Text f={f} kind="aux" color={C.muted} x={m} y={f === "h" ? 560 : 440} w={textW}>
        O grupo escolhe o cardápio. O app não cobra dinheiro.
      </Text>
    </AbsoluteFill>
  );
}

/** Apoia-se only: a plain card with the support page's identity. No new reward or character. */
function Support({ f }: { f: Format }) {
  const { W, m } = useLayout(f);
  const x = f === "h" ? 240 : m;
  const w = W - 2 * x;
  return (
    <AbsoluteFill>
      <Brand x={x} y={f === "h" ? 150 : 300} />
      <Text f={f} x={x} y={f === "h" ? 360 : 600} w={w}>
        Quer ajudar o Pacto a continuar?
      </Text>
      <Text f={f} kind="address" color={C.accent} x={x} y={f === "h" ? 520 : 840} w={w}>
        Apoie em pactus.dev.br/apoiar
      </Text>
      <Text f={f} kind="aux" color={C.muted} x={x} y={f === "h" ? 700 : 1100} w={w}>
        Apoio voluntário, sem vantagens no app.
      </Text>
    </AbsoluteFill>
  );
}
