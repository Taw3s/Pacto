// Fake Gemini generateContent endpoint for tests. Logs every request to gemini_calls.jsonl.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const model = decodeURIComponent(req.url.match(/models\/([^:]+):/)?.[1] ?? "");
      fs.appendFileSync(path.join(DIR, "gemini_models.log"), model + "\n");
      if (model.includes("overloaded")) {
        res.writeHead(503, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { code: 503, message: "The model is overloaded. Please try again later.", status: "UNAVAILABLE" } }));
      }
      if (model.includes("badkey")) {
        res.writeHead(400, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { code: 400, message: "API key not valid.", status: "INVALID_ARGUMENT" } }));
      }
      if (model.includes("slow")) await new Promise((r) => setTimeout(r, 30_000));
      const json = JSON.parse(body || "{}");
      const parts = json.contents?.[0]?.parts ?? [];
      const prompt = parts.find((p) => p.text)?.text ?? "";
      const images = parts.filter((p) => p.inline_data).map((p) => p.inline_data);
      const image = images[0];
      const claim = JSON.parse(prompt.match(/Claim \(JSON\): (.*)$/m)?.[1] ?? "{}");
      fs.appendFileSync(
        path.join(DIR, "gemini_calls.jsonl"),
        JSON.stringify({ url: req.url, key: req.headers["x-goog-api-key"], claim, imageBytes: image ? Buffer.from(image.data, "base64").length : 0, images: images.length, mime: image?.mime_type, schema: !!json.generationConfig?.responseSchema }) + "\n",
      );
      let answer;
      if (claim.goal === "typing") answer = { consistent: "yes", number: 72, seen: "Tela do Monkeytype mostrando 72 WPM." };
      else if (claim.goal === "study" && claim.declared_minutes >= 200) answer = { consistent: "yes", number: 45, seen: "Caderno com exercícios e um cronômetro marcando 45 minutos." };
      else if (claim.goal === "study") answer = { consistent: "yes", number: null, seen: "Caderno aberto com anotações de matemática." };
      else if (claim.goal === "project" && /gato/i.test(claim.project_title ?? "")) answer = { consistent: "no", number: null, seen: "Foto de um gato dormindo no sofá." };
      else if (claim.goal === "reading" && claim.declared_pages === 23) answer = { consistent: "unclear", number: null, seen: "Imagem muito escura." };
      else if (claim.goal === "reading") answer = { consistent: "yes", number: 12, seen: "Livro aberto na página 12." };
      else answer = { consistent: "yes", number: null, seen: "Tela com código de um projeto." };
      // A study summary that answers the question of the day is rated too (0017).
      if (claim.study_question) answer.answer = (claim.study_summary ?? "").length < 50 ? "vague" : "specific";
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }));
    });
  })
  .listen(54400, "127.0.0.1", () => console.log("gemini mock on :54400"));
