# Testes de ponta a ponta (E2E)

Rodam o app de verdade num navegador (Playwright + Chromium), contra um Supabase **local e descartável**,
com o Gemini **simulado**. Também passam o [axe](https://github.com/dequelabs/axe-core-npm) em todas as telas
(acessibilidade WCAG 2.1 AA, contraste incluído). Nunca tocam no banco de produção.

No GitHub, rodam sozinhos a cada pull request (`.github/workflows/ci.yml`). Os prints de cada execução
ficam no artefato **e2e-screens-and-logs** da execução.

## Etapas

| Arquivo | O que cobre |
|---|---|
| `e2e_a.mjs` | Login, convite, link mágico, conta sem convite |
| `e2e_b.mjs` | Provas do dia, compressão da foto e miniatura, tentativas de burlar a API |
| `e2e_c.mjs` | Feed e tribunal (culpado/inocente com motivo, condenação e absolvição) |
| `e2e_d.mjs` | Dívidas, histórico, sequência, configurações |
| `e2e_f.mjs` | Projetos, ranking do mês, folga |
| `e2e_g.mjs` | Juiz IA (simulado): confere, diverge, abre tribunal, selo VERIFICADO |
| `e2e_e.mjs` | PWA instalável |
| `e2e_h.mjs` | Acessibilidade (axe) em todas as telas, desktop e página "Sem conexão" |
| `e2e_i.mjs` | Baú do dia, coleção, desafio da semana e avisos push (servidor de push falso) |
| `e2e_j.mjs` | Prova refeita depois de condenada e sessões extras de estudo |
| `e2e_k.mjs` | Animações do juiz, tribunal, várias fotos, guia do juiz, Google, sessão órfã, criar desafio e cardápio |
| `e2e_l.mjs` | Data da foto, carimbos, resumo semanal e teste de digitação (texto, inglês, 5 minutos, cartão do melhor teste) |
| `e2e_m.mjs` | Remover membro, sair do grupo e excluir a conta (por último: tira pessoas do grupo) |
| `e2e_n.mjs` | Apresentação pública em `/`: textos, larguras 320–1440, alvos, rotas privadas continuam fechadas, ações para visitante, membro e conta sem grupo |
| `e2e_o.mjs` | Desafio novo: primeiros passos na Hoje (link copiado, combinado, primeira prova vinda do servidor, recolher e reabrir) e link de convite por cadastro com e-mail, login e Google; Feed e Ranking vazios |

As etapas compartilham estado (usuários criados em `a`, histórico semeado antes de `d`): rode sempre
o conjunto inteiro com `run.sh`, num banco recém-criado.

## Datas

Tudo é relativo a **hoje** em São Paulo (`dates.mjs`, `seed.sql`): todos entram há 6 dias, e a folga do
grupo é o dia da semana de amanhã (`setup.sql`). Assim os números esperados são os mesmos em qualquer data.

## Rodar no seu computador

Precisa de Docker, Node 22 e o [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
supabase start                      # na raiz do repositório; aplica supabase/migrations
eval "$(supabase status -o env)"
export SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
export NEXT_PUBLIC_SUPABASE_URL=$API_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY NEXT_PUBLIC_SITE_URL=http://localhost:3000
export GEMINI_API_KEY=test-key GEMINI_API_URL=http://127.0.0.1:54400
export PUSH_TEST_SERVICE=1   # deixa o app entregar avisos ao servidor de push falso (nunca em produção)
export CRON_SECRET=local-e2e-cron-secret # mesmo valor no app e nos testes; somente ambiente local
export NEXT_PUBLIC_GOOGLE_LOGIN=1   # mostra o botão do Google (o teste só confere o redirecionamento)

npm ci && npm run build && npx next start -p 3000 &   # o app, com essas variáveis
cd e2e && npm ci && npx playwright install chromium
bash run.sh
```

Para rodar de novo, comece de um banco limpo: `supabase db reset` (na raiz) e depois `bash run.sh`.

Variáveis opcionais: `APP_URL` (padrão `http://localhost:3000`), `MAIL_URL` (caixa de e-mail do Supabase
local, padrão `http://127.0.0.1:54324`), `CHROMIUM_PATH` (usar um Chromium já instalado).

## Testes de segurança locais

Com o app e o Supabase locais configurados acima, execute `npm run test:security`
dentro de `e2e`. O teste recusa destinos fora de localhost/127.0.0.1, cria dois
grupos e três contas fictícias e remove esses dados ao terminar. Cobre acesso
entre grupos, permissões de remoção, funções administrativas, HTML em nomes,
JSON inválido, autenticação dos crons e upload em pasta alheia. Não realiza
carga nem acessa produção. Use um banco local descartável, como nos demais E2E.

`npm run test:security:extended` amplia a cobertura para concorrência (até oito
chamadas por cenário), revogação de sessões, upload e exclusão de arquivos,
CSRF com formulário real, proteção de origem, RPCs e fila de limpeza. Usa
atrasos temporários de teste no banco local para reproduzir corridas e os
remove ao terminar. Um caso espera a duração real do teste de digitação.
O resultado estruturado fica em `security-extended-results.json`; observações
documentam limites do desenho, sem serem contabilizadas como proteções aprovadas.

`npm run test:security:depth` testa tentativas simultâneas sobre o mesmo texto,
comprimentos e contagens falsos, textos desconhecidos, adulteração de links de
fotos, logout, remoção e troca de grupo. Espera a duração real de uma tentativa
de digitação e salva `security-depth-results.json`. Links assinados continuam
sendo credenciais portáveis; os prazos aceitos pelo armazenamento e o uso de
resultados autodeclarados são observações, não garantias de proteção.

Os comprimentos dos 120 textos estão registrados no banco pela migração 0022.
Alterações ou novos textos exigem uma migração que mantenha esse catálogo em
sincronia. O teste `typing-catalog.test.ts` detecta divergências da versão inicial.

As migrações da auditoria agora são 0019–0024, depois da pergunta do dia (0017)
e do histórico de passagens (0018). Não aplique os nomes antigos dos relatórios
históricos junto com a sequência atual.

`npm run test:security:transactions` verifica saída do proprietário com remoção
pendente, oito remoções duplicadas e oito sessões extras simultâneas. Utiliza
travas e atraso de teste no banco local para controlar a ordem, desfazendo-os
ao terminar. A migração 0023 corrige esses casos. Rode as suítes em sequência,
nunca em paralelo no mesmo banco; elas preparam e removem dados descartáveis.

Na raiz, `npm run test:security:binding` executa três integrações da rota de
gestão de membros com Auth, banco e armazenamento locais reais. O adaptador
da sessão usa um JWT válido do laboratório e o transporte pausa uma chamada
para mudar de grupo entre consulta e alteração. O teste confere que a foto
de outro membro continua existindo. A migração 0024 e a rota atualizada devem
ser publicadas nessa ordem. Esses testes usam configuração separada e não
são executados pela suíte unitária sem o laboratório.

## Auditoria responsiva

Depois de rodar as etapas (o banco local fica com dados), `node responsive-audit.mjs /tmp/audit` abre cada tela em 320, 360, 390, 768, 1024 e 1440 px e lista: rolagem horizontal da página, elementos fora da tela, texto cortado e alvos de toque menores que 44 px. Os prints ficam na mesma pasta, para revisão visual. O único achado esperado é o resumo das metas da Hoje escondido para leitor de tela.
