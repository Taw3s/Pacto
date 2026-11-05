# Sprites low poly

Modelos 3D procedurais (three.js) de todos os sprites em `public/lowpoly`. São exportados como PNG 48×48 com fundo transparente, sempre com a mesma câmera, luz e enquadramento.

```bash
cd tools/lowpoly
npm install
npx playwright install chromium   # ou: export CHROMIUM_PATH=/caminho/do/chrome
npm run render                    # todos os sprites
node render.mjs judge-            # só os quadros do juiz
```

- `models.js`: um modelo por sprite. O juiz é um modelo só (`judgeScene`), com uma pose por quadro em `JUDGE_FRAMES`. Cabeça, sobrancelhas, braços, martelo, lupa, carimbo e papel são peças separadas.
- `crowd.js`: a multidão do tribunal (seis silhuetas de costas, da cintura para cima, cada uma em repouso e nas poses `a` e `b` do ajeitar, `node render.mjs crowd`); um quadro invisível deixa todas na mesma escala e na mesma linha de base. A página monta as cinco fileiras e os bancos (`CourtCrowd`).
- `decor.js` e `collectibles.js`: objetos de ambiente e colecionáveis novos, em módulos separados para os nomes de funções auxiliares não colidirem com os do `models.js`. Cada função entra no `MODELS`.
- A sequência e o tempo de cada animação ficam em `src/lib/judge.ts`. Um quadro novo precisa entrar nos dois arquivos.
- Os sprites aparecem no app em escala inteira (48, 96 ou 144 px), com `image-rendering: pixelated`.
- Ícone do app: `node icons.mjs` renderiza o juiz (`logoJudge`) grande, corta o busto e monta os quatro PNGs de `public/icons` sobre o amarelo do app. Modelos com nome `logo…` saem com antialias e uma luz frontal; os sprites não mudam.
