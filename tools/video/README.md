# Vídeo de apresentação

Feito com [Remotion](https://www.remotion.dev) (vídeo em React), pelo brief do Astra de 28/10/2026. Duas versões:

| Composição | Formato | Duração | Onde |
|---|---|---|---|
| `Apoiase` | 1920×1080 | 43 s (com o cartão de apoio) | campanha do Apoia-se (YouTube) |
| `WhatsApp` | 1080×1920 | 38 s | WhatsApp |

Tudo o que aparece é tela de verdade: capturas do app rodando com um **grupo de demonstração** (Ana, Bruno, Carla,
Diego e Elisa, nomes fictícios; nunca dados reais). O juiz e a pasta da prova são desenhados por cima, quadro a
quadro, com os sprites de `public/lowpoly` e a sequência de `src/lib/judge.ts`.

## 1. Capturas (no GitHub)

O workflow **Video shots** (`.github/workflows/video-shots.yml`) sobe um Supabase local, monta o grupo pelo app de
verdade (`demo/capture.mjs`: cadastro, provas com as fotos de `demo/photos`, juiz IA simulado, tribunal, dívida) e
fotografa cada peça em 4× (`demo/out/*.png` + `meta.json` com a posição do juiz, da pasta e dos blocos). Roda num
push em `video/*` que mexa no app ou em `demo/`, ou à mão. O resultado vai para o branch **`video-shots`**
(só a última execução; também fica no artefato da execução):

```bash
git fetch origin video-shots
mkdir -p demo/out && git -C ../.. archive origin/video-shots | tar -x -C demo/out
```

As fotos das provas (`demo/photos`) são ilustrações feitas por `npm run photos`; não são fotos de ninguém.

## 2. Vídeo (na sua máquina)

```bash
cd tools/video
npm ci
npm run prepare-assets          # copia sprites, ícone e capturas para public/
npm run studio                  # pré-visualização no navegador
npm run render                  # out/pacto-apoiase.mp4 e out/pacto-whatsapp.mp4
```

Num Chromium já instalado: `export CHROMIUM_PATH=/caminho/do/chrome` antes de `render`.

## Regras do brief (não mudar sem o Astra)

- Rodada 5: uma prova por vez nos dois formatos (cabeçalho e "Informado" de um lado, evidência do outro), com a informação essencial em 36 px ou mais no horizontal e 42 px ou mais no vertical; a pasta da sala é sempre um sprite de 96 px por cima da captura sem objetos.
- Cortes secos entre cenas; dentro delas, movimentos curtos em passos (entrada de card: 6 quadros, 24 px em 3 posições).
- Sprites só em 96, 144 ou 192 px, em posição inteira, `image-rendering: pixelated`; sem zoom, rotação ou blur.
- O juiz depende só do quadro do vídeo (nada de temporizador), para toda exportação sair igual.
- Inter nas frases; Pixelify só em marca e rótulos curtos, com os algarismos da Inter.
- Cada formato tem layout próprio; o vertical nunca é recorte do horizontal.
- Selo "VERIFICADO!" é do conjunto das três provas; `present` abre a contestação e `gavel` vem só depois do
  resultado; a dívida aparece pendente antes, e só o item recebido vira recibo.
- Sem trilha por enquanto: o vídeo funciona mudo. Música e efeitos só com licença guardada (uso na campanha e no YouTube).
