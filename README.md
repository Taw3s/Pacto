# Pacto

PWA de compromisso diário para grupos de amigos. Todo dia cada pessoa cumpre três metas com prova (**estudo**, **digitação** e **leitura**, mais um projeto opcional) até 23:59 de São Paulo. Dia descumprido vira dívida com o grupo (um cardápio que o grupo escolhe, padrão 1 Coca + 1 salgado). Qualquer prova pode ir a **tribunal**, e o grupo vota. Há um juiz IA que confere as fotos (só informa, nunca decide), ranking mensal, sequência, baús com uma coleção de objetos e avisos push.

Em produção em <https://www.pactus.dev.br>, em beta fechado com um grupo de amigos (trilha de programação).

**Stack:** Next.js 15 (App Router, React 19) + TypeScript + Tailwind 4 + Supabase (Postgres com RLS, Auth, Storage) + Vercel. Sprites low poly gerados por código em `tools/lowpoly` (three.js); vídeo de apresentação em `tools/video` (Remotion).

> **Feito com assistência de IA.** A maior parte do código foi escrita com o Claude Code, sob a direção e a revisão do autor, que define o produto, as regras e as prioridades, opera a produção e roda o beta. O design segue briefs de uma segunda IA. As notas de trabalho com a IA estão em [`CLAUDE.md`](CLAUDE.md) e o registro de decisões e pendências, em [`docs/ideias.md`](docs/ideias.md).

---

## 1. Rodar localmente

Pré-requisitos: Node 22+ e um projeto Supabase (passo 2).

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev                  # http://localhost:3000
```

Testes:

```bash
npm test            # unitários (Vitest)
npm run lint && npm run typecheck
npm run test:db     # SQL + RLS num Postgres descartável (Postgres 15+ instalado; não roda como root)
```

O E2E (`e2e/run.sh`, Playwright + axe) sobe um Supabase local descartável, com Gemini e push simulados: veja [`e2e/README.md`](e2e/README.md). O CI roda tudo isso em cada PR.

---

## 2. Criar o projeto no Supabase

1. Crie um projeto em <https://supabase.com/dashboard>. `South America (São Paulo)` é a região mais próxima.
2. **SQL Editor:** rode **todos** os arquivos de [`supabase/migrations`](supabase/migrations), um de cada vez e **em ordem** (`0001_init.sql`, `0002_…` e assim por diante). Cada um confere se o anterior foi rodado. Eles criam tabelas, views, gatilhos com as regras de negócio, RPCs, políticas RLS e os buckets privados do Storage. O primeiro grupo é criado pelo próprio app ("Criar um desafio").
3. **Authentication → URL Configuration**
   - **Site URL:** a URL da Vercel (ex.: `https://pacto-xyz.vercel.app`). Antes do deploy, use `http://localhost:3000`.
   - **Redirect URLs:** adicione `http://localhost:3000/**` e `https://SEU-APP.vercel.app/**`.
4. **Authentication → Email Templates.** Troque o link destes dois templates. Assim o link funciona mesmo se for aberto num navegador diferente do que pediu:
   - **Magic Link:**
     ```html
     <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/hoje">Entrar no Pacto</a></p>
     ```
   - **Confirm signup:**
     ```html
     <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/hoje">Confirmar e-mail</a></p>
     ```
   A rota `/auth/confirm` aceita os dois formatos: esse (`token_hash`) e o padrão do Supabase (`?code=`).
5. **Limite de e-mails.** O SMTP embutido do Supabase tem um limite baixo de envios por hora. Duas saídas:
   - recomendar que todos entrem **com senha**, que não gasta e-mail no login; ou
   - configurar um SMTP próprio em **Authentication → SMTP Settings** (Resend, Brevo etc.).

   **Não desligue Confirm email** (*Authentication → Providers → Email*). Sem ele, qualquer pessoa cria uma conta com o e-mail de outra e uma senha
   que só ela sabe; quando o dono do e-mail entra depois (link ou Google), cai na mesma conta e a senha do outro continua valendo.
6. **Project Settings → API:** copie a `Project URL` e a chave `anon` (ou *publishable*) para o `.env.local`.

> **Não desligue "Allow new users to sign up".** A entrada por convite usa o cadastro normal do Supabase: o código vai nos metadados e um trigger cria o membro. Quem criar conta sem código válido fica sem acesso a nada (RLS) e cai na tela de pedir código.

---

## 3. Deploy na Vercel

1. Importe o repositório em <https://vercel.com/new> (o framework é detectado como Next.js).
2. Em **Environment Variables**, preencha as variáveis de [`.env.example`](.env.example). O mínimo é `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`. Variáveis com valor só ASCII visível (a Vercel recusa acentos em valores usados como cabeçalho).
3. `CRON_SECRET` (segredo aleatório, em Production e Preview) libera os agendamentos de [`vercel.json`](vercel.json): lembretes diários, limpeza das fotos e anexos com mais de 30 dias e o resumo semanal. Sem ele, as rotas `/api/cron/*` respondem 401.
4. Depois do primeiro deploy, coloque a URL final em *Site URL* e *Redirect URLs* do Supabase.

### IA nas fotos (opcional, Gemini)

Depois de cada check-in, o servidor manda a foto e o que foi declarado para o Gemini, que descreve o que vê.
O app mostra "IA conferiu" quando bate, "IA diverge" quando não bate (ex.: cronômetro com 45 min e 240 min declarados) e "IA indisponível" quando não deu para conferir.
**A IA nunca anula check-in nem cria dívida:** quem decide continua sendo o tribunal.

Para ligar, adicione na Vercel (*Settings → Environment Variables*) e faça **Redeploy**:

| Nome | Valor |
|---|---|
| `GEMINI_API_KEY` | chave criada em <https://aistudio.google.com> → *Get API key* |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → *Project Settings → API Keys* → chave **secret / service_role** |
| `GEMINI_MODEL` | opcional; o padrão é `gemini-flash-latest`. Se ele estiver sobrecarregado (503) ou lento, o app tenta sozinho `GEMINI_FALLBACK_MODEL` (padrão `gemini-flash-lite-latest`) |

Os endpoints agendados de lembrete/resumo exigem também `CRON_SECRET`, um segredo aleatório configurado somente no servidor. Sem ele, recusam a execução com 401; esse comportamento é intencional.

> Essas duas chaves são **segredos de servidor**: nunca use o prefixo `NEXT_PUBLIC_` nelas e nunca as coloque no código.
> No plano gratuito da API, o Google pode usar o conteúdo enviado (fotos e resumos) para melhorar os produtos dele. A política de privacidade diz isso; se você rodar uma cópia, avise o seu grupo.

### Login com Google (opcional)

O botão "Entrar com Google" só aparece com `NEXT_PUBLIC_GOOGLE_LOGIN=1`. O Google só confirma quem é a pessoa: quem ainda não está em um grupo cai na tela do código de convite. Se o Gmail for o mesmo e-mail de uma conta que já existe, o Supabase usa a mesma conta.

1. **Google Cloud Console** → *APIs e serviços*:
   - **Tela de consentimento OAuth:** público externo, com nome, e-mail de suporte e o domínio da Vercel.
   - **Credenciais** → *Criar credenciais* → *ID do cliente OAuth* → *Aplicativo da Web*:
     - **Origens JavaScript autorizadas:** o endereço do app na Vercel.
     - **URIs de redirecionamento autorizados:** `https://SEU-PROJETO.supabase.co/auth/v1/callback`. O endereço exato aparece no Supabase, no passo 2.
2. **Supabase** → *Authentication* → *Sign In / Providers* → **Google**: ative e cole o *Client ID* e o *Client Secret*. O segredo fica só no painel do Supabase, nunca no código nem em variável `NEXT_PUBLIC_`.
3. **Supabase** → *Authentication* → *URL Configuration*: o endereço da Vercel com `/**` precisa estar nos *Redirect URLs*.
4. **Vercel** → *Environment Variables*: `NEXT_PUBLIC_GOOGLE_LOGIN` = `1`, depois **Redeploy**.

### Aviso de erros (opcional, Sentry)

Com `NEXT_PUBLIC_SENTRY_DSN`, o app manda só erros, sem tracing, replay nem dados pessoais (configuração em `src/lib/sentry.ts`). Vazio, fica desligado.

### Instalar no celular

- **iPhone (Safari):** botão Compartilhar → *Adicionar à Tela de Início*.
- **Android (Chrome):** menu ⋮ → *Instalar app*.

> No iPhone, o app instalado não compartilha sessão com o Safari. Se você pedir um link mágico, ele abre no Safari, não no app. **Dentro do app instalado, entre com senha.**

---

## 4. Decisões de arquitetura

### Dívidas e sequências calculadas na hora
Dias descumpridos, dívidas e sequências **não são gravados**: o servidor calcula a cada carregamento em [`src/lib/ledger.ts`](src/lib/ledger.ts), a partir das provas, das folgas e dos pagamentos. Nenhuma tarefa agendada pode deixar o saldo errado, e uma regra corrigida vale para o passado. O gatilho de `payments` repete a regra de "dia descumprido" no SQL para impedir pagar um dia que não é devido: **mudou num lugar, mude no outro.** Os agendamentos da Vercel só mandam lembretes e apagam mídia antiga.

### Fuso horário
- Todo "dia" é uma data `YYYY-MM-DD` em **America/Sao_Paulo**: `sp_today()` no Postgres e `spToday()` em [`src/lib/dates.ts`](src/lib/dates.ts), via `Intl`. Nunca UTC puro.
- **O cliente não escolhe a data do check-in.** Um trigger grava `day = sp_today()` no momento do insert. Por isso não dá para enviar check-in de dia passado, nem pela API.
- Um envio que chegar ao servidor depois de 00:00 conta para o novo dia.

### Provas imutáveis
Provas não se editam: `checkins` só tem `INSERT` para o usuário, e o caminho de cada arquivo (`<grupo>/<pessoa>/…`) é conferido pelo RLS do Storage e por gatilho. O RLS está ligado em todas as tabelas; funções `security definer` fixam o `search_path`; views usam `security_invoker`.

### Fotos
Comprimidas no navegador antes do upload ([`src/lib/image.ts`](src/lib/image.ts)): lado maior de no máximo 1600 px, JPEG com qualidade 0,8, respeitando a rotação EXIF. Fotos de perfil ficam em 512 px. O bucket aceita só `image/jpeg` até 5 MB. As fotos podem vir da câmera ou da galeria.

### Tribunal (contestação)
- Só dá para contestar check-ins **de hoje ou de ontem**. Cada check-in pode ter uma contestação.
- **Votam** os membros que já estavam no grupo quando a contestação foi aberta, menos o dono do check-in. O eleitorado fica congelado: quem entra depois não vota nem muda a maioria, então um veredito encerrado não reabre. Quem contestou já conta como 1 voto "procede".
- **Procede:** maioria absoluta dos aptos (com 6 pessoas, 3 de 5). O check-in é **anulado** e a meta deixa de contar; se o dia não fechar as 3 metas, vira dívida.
- **Rejeitada:** quando "procede" não consegue mais chegar à maioria.
- **Prazo de 72h:** sem maioria até lá, vale quem tiver mais votos; o empate mantém o check-in.
- O dono responde **uma vez**. Votos não mudam. Check-in anulado não pode ser refeito (a regra é uma prova por meta por dia).
- O veredito é calculado na view `dispute_results` (sem cron, como as dívidas).

### Folga
As trocas ficam em `day_off_changes` com `effective_from = próxima segunda-feira`, uma escolha por semana (trocar de novo na mesma semana só substitui a escolha). Assim toda semana de segunda a domingo tem exatamente 1 folga, e trocar nunca muda dias passados.

### Juiz IA
O Gemini descreve a foto e compara com o que foi declarado. A leitura só informa: nunca anula prova, nunca cria dívida e nunca vota. Cada chamada passa por uma cota diária no banco (`claim_ai_review`).

---

## 5. Segurança e privacidade

- Falhas de segurança: veja [`SECURITY.md`](SECURITY.md). Não abra issue pública.
- A política de privacidade (`/privacidade`) descreve o que o código guarda e manda para fora (LGPD). Quem rodar uma cópia é o controlador dos dados dessa cópia e precisa preencher `NEXT_PUBLIC_CONTROLLER_NAME` e `NEXT_PUBLIC_CONTACT_EMAIL`.
- Nenhum segredo vai para o repositório: use `.env.local` e o painel da Vercel. `service_role` só no servidor, nunca com prefixo `NEXT_PUBLIC_`.

## 6. Licença e créditos

Código sob **GNU AGPL-3.0** (`AGPL-3.0-only`): quem modificar o Pacto e oferecer a versão modificada pela rede precisa publicar o código dela. Os sprites de `public/lowpoly` e os ícones são gerados pelo código deste repositório e seguem a mesma licença.

Terceiros: fontes Inter e Pixelify Sans (SIL Open Font License 1.1, instaladas pelo npm); o vídeo em `tools/video` usa o Remotion, que tem licença própria (grátis para pessoas e empresas pequenas; veja <https://www.remotion.dev/license>).

Contribuições: anexos de PDF e ZIP nas provas por [GXDZ1](https://github.com/GXDZ1).
