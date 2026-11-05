// Fake Gemini for the demo group: every proof matches what was declared (the video shows the day verified).
import http from "node:http";

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const prompt = JSON.parse(body || "{}").contents?.[0]?.parts?.find((p) => p.text)?.text ?? "";
      const claim = JSON.parse(prompt.match(/Claim \(JSON\): (.*)$/m)?.[1] ?? "{}");
      const seen = {
        typing: "Teste de digitação feito no app.",
        study: "Caderno com anotações e exercícios de funções do 2º grau.",
        reading: "Livro aberto no capítulo 4, páginas 48 e 49.",
      }[claim.goal] ?? "Tela com código de um projeto.";
      const answer = { consistent: "yes", number: null, seen };
      if (claim.study_question) answer.answer = "specific";
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }));
    });
  })
  .listen(54400, "127.0.0.1", () => console.log("demo gemini mock on :54400"));
