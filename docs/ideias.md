# Pacto — ideias, decisões e pendências

Documento vivo: anote aqui o que for surgindo. Atualizado em 28/10/2026.

## Visão

O Pacto tem duas camadas:

1. **Núcleo (serve para qualquer conteúdo):** grupo, metas diárias, provas, juiz, tribunal, dívida, sequência e ranking. É a cobrança social, e é o que faz as pessoas voltarem.
2. **Trilhas (uma por conteúdo):** cada trilha tem as suas metas e pelo menos uma mecânica que o próprio app mede, sem depender de foto. A digitação é a mecânica da trilha de programação.

**Princípio:** toda trilha boa tem uma mecânica que o app mede e ninguém consegue fingir (o servidor cronometra e calcula a nota, como no teste de digitação).

## Agora: beta fechado

- Foco só em **programação**: estudar, ler um livro e fazer o teste de digitação.
- **Pergunta que o beta precisa responder:** o grupo continua usando depois de 4 semanas? Se a cobrança social segura as pessoas, vale investir em trilhas novas. Se não segura, nenhuma mecânica nova resolve.
- Sinal bom até aqui: os amigos estão mandando fotos e fazendo o teste de digitação.

## Bugs para corrigir

- [x] **Varredura responsiva (27/10):** nenhuma tela rolava para os lados, mas nomes longos viravam "…" (Hoje, ranking, pódio, tribunal, jurados) e três alvos de toque tinham menos de 44 px (nome no Feed, "Como a pontuação funciona", seta do mês em 320 px). Corrigido.
- [x] **Números ilegíveis (beta, 27/10):** na fonte pixel o 5 parecia S e o 3 parecia 8 (ranking, placar, código de convite). Corrigido: os algarismos usam a Inter, as letras continuam pixel.
- [x] **Imagem da prova de digitação não mudava ao refazer o teste** (PR #26): Hoje, Feed e página da prova desenham o cartão do melhor teste do dia. Falta: o tribunal ainda mostra a imagem guardada.
- [x] **Palavras "se mexendo" no teste de digitação** (feedback do grupo, 26/10): a partir da 40ª palavra a tela apagava a mais antiga e todas as quebras de linha mudavam. Corrigido no PR seguinte ao #26.
- [x] **Não dava para voltar e corrigir uma palavra** (feedback do grupo): agora Backspace numa palavra vazia volta para a anterior, se ela estiver errada (como no Monkeytype). No celular depende do teclado mandar o evento de apagar; conferir no Android e no iPhone.
- [x] **Leitura "pendente" que não deixava enviar** (beta, 26/10): o envio tinha funcionado, mas a tela não atualizou; o segundo envio dava "já enviada". Agora o app atualiza a tela em vez de mostrar erro.
- [x] **Excluir a conta usava `prompt()` nativo**: desde a rodada 5 usa o `ConfirmDialog` `danger` com o campo "Digite EXCLUIR para confirmar".
- [ ] **E2E do botão do Google pode falhar por corrida** (`e2e_k`): conta o botão logo após o `goto`, antes da hidratação. Passou no CI até aqui; se falhar, trocar `count()` por `waitFor()`.
- [ ] Ouvir o grupo sobre o que mais está "horrível" no teste de digitação depois dessas correções (pedir prints ou vídeo).

## Pendências de lançamento

Plano (27/10): desconhecidos usando de graça na web → medir retenção 4–8 semanas → cobrar pelo site (plano por grupo) → Play Store → App Store. Para desconhecidos usarem:

- [x] **E-mail de login** pelo Resend (região São Paulo), testado em 29/10: e-mail de fora entregue e login pelo link funcionando. Domínio verificado no Resend (DKIM, `send`, `rsend`, `_dmarc` no registro.br); SMTP e URLs (`https://www.pactus.dev.br`) configurados no Supabase; política cita o Resend (#52).
- [x] **Espaço das fotos**: apagar a foto grande depois de 30 dias e manter a miniatura; compressão menor (PR #35).
- [x] **Sair do grupo, remover membro, excluir conta** (migration 0016). Rodar a 0016 antes do merge.
- [x] **Política de privacidade e termos**: páginas `/privacidade` e `/termos`. Falta: você preencher `NEXT_PUBLIC_CONTROLLER_NAME` e `NEXT_PUBLIC_CONTACT_EMAIL` na Vercel, e uma revisão jurídica antes de cobrar.
- [x] **Página de apresentação** e **primeiros passos** de um grupo novo (rodada 4: PRs #44, #45 e #46). Convite com Google testado em produção (28/10): volta com o código preenchido.
- [x] **Aviso de erros** (Sentry, PR de 04/11): só erros, sem dados pessoais, ligado pelo `NEXT_PUBLIC_SENTRY_DSN` em Production. Configurado em 04/11: projeto `pactus` (região EUA), IP não guardado, DSN só em Production, alerta por e-mail para erro novo; o erro de teste chegou sem usuário nem IP.
- [x] **E-mail para quem é de fora:** resolvido pelo Resend (29/10).
- [x] **Beta fechado** (decidido em 28/10): sem código de beta. O Davi cria o grupo e manda o link de convite (`/join?convite=…`) num grupo de WhatsApp; quem recebe cai no mesmo desafio. Medir com `retention.sql` na 1ª e 2ª semana.
- [ ] **Cópia do banco:** pausa por inatividade não preocupa (o cron diário mantém o projeto ativo e a pausa se desfaz pelo painel). O risco é apagar algo por engano: sem cobertura no plano grátis. Combinado: baixar um backup antes de cada migration; plano Pro (backup diário) se entrar dinheiro do Apoia-se.
- [ ] **Limites dos planos grátis** (Supabase, Vercel Hobby, Gemini): anotar os números atuais e o que acontece quando estouram (o juiz IA só deixa de conferir; a prova continua valendo).
- [x] **Canal de feedback** (28/10): o próprio grupo de WhatsApp do beta.
- [x] **Consulta de retenção** por grupo: `supabase/queries/retention.sql` (só leitura, roda no SQL Editor). A migration 0018 guarda as saídas (entrada, saída e semanas com prova, sem nome), então quem sai conta como perda. Quem saiu antes de rodar a 0018 não aparece.
- [ ] **Quando virar empresa e cobrar:** o Marco Civil (Lei 12.965/2014, art. 15) obriga a guardar os registros de acesso (IP, data e hora) por 6 meses, sob sigilo. Hoje não se aplica (pessoa física, sem fins econômicos).
- [ ] **Revisão jurídica** antes de cobrar: a política e os termos foram conferidos com o texto da LGPD, do CDC e do Marco Civil (repositório ctresb/leis), mas faltam as resoluções da ANPD para pequenos agentes (CD/ANPD nº 2/2022) e uma leitura de advogado.
- [ ] Conferir em Configurações se você aparece como dono do grupo atual.
- [x] **Preview da Vercel** (28/10): falhava desde o #8 por acentos no `CRON_SECRET` do ambiente Preview. Corrigido na Vercel; agora dá para testar cada mudança no celular antes do merge.
- [ ] **Domínio** `pactus.dev.br` comprado em 28/10; endereço principal **`https://www.pactus.dev.br`** (o sem `www` redireciona). Falta: o e-mail (acima) e avisar quem usa `pactus-rho.vercel.app` que instale de novo no domínio novo (login, primeiros passos e avisos push não passam). Opcional: aviso no domínio antigo.
- [ ] **Apoia-se** (doação pura, sem vantagens no app): página `/apoiar` no ar (#49). Falta criar a campanha e pôr o link em `NEXT_PUBLIC_SUPPORT_URL` (Production) + Redeploy. Página com nomes de apoiadores só com 3 ou mais.
- [ ] **Vídeo de apresentação** (#50): v1 de 43 s e 38 s aguardando revisão do Astra (tribunal com 2 votos, provas pequenas no 16:9, selo num painel, sem a pergunta do dia). Sem áudio; narração opcional, de preferência com a voz do Davi. Divulgar só depois que `pactus.dev.br` abrir.
- [x] **Patch de segurança** (#58, refeito do #40): migrations 0019–0024 rodadas em produção e mergeadas em 29/10. O #40 original pode ser fechado.
- [x] **Juiz IA no plano grátis do Gemini** (decidido em 28/10, #48): a política diz que o Google pode usar fotos e respostas, com revisão humana. Ativar o faturamento antes de abrir para desconhecidos (custo estimado abaixo de US$ 1/mês por 10 pessoas; o banco já limita a 30 chamadas por pessoa por dia).
- [ ] **Astra:** revisar os sprites novos (troféus de prata e bronze, os 6 itens do cardápio) e as ideias de "elementos jurídicos" do ChatGPT.
- [ ] Alguém que usa Java e TypeScript no dia a dia ler os textos dessas abas.

## Trilhas futuras

### Enem

- **Sprint de questões:** bloco cronometrado no ritmo da prova (cerca de 3 minutos por questão). As provas e gabaritos antigos do Enem são públicos (INEP); conferir a licença antes de usar.
- **Leitura cronometrada com interpretação:** velocidade de leitura junto com acerto. É a "digitação" do Enem.
- **Flashcards com repetição espaçada:** fórmulas, datas, conceitos.
- **Redação semanal:** foto da redação, com o juiz IA conferindo só a estrutura (tema, proposta de intervenção, tamanho). Não prometer nota de redação feita por IA.

### Programação (pedidos do grupo, 27/10)

- **Treino de linguagens (pedido do beta):** questõezinhas simples em várias linguagens, "igual ao LeetCode". Sem compilador dá para começar com questões de múltipla escolha, "qual a saída deste código" e lacunas de sintaxe, com respostas conferidas pelo servidor. Rodar código de verdade pede um executor isolado (Judge0, Piston), com custo e risco de segurança: só depois que a versão sem execução provar que o grupo usa.
- **Digitação de código (pedido do beta):** digitar código em vez de prosa. Contraria a decisão "só prosa": símbolos são difíceis no teclado do celular. Saída possível: um modo "Código" só no PC, com recordes próprios (o recorde já é separado por modo). Decidir antes de fazer.

### Mecânicas que servem para várias trilhas

- Teste cronometrado pelo servidor (já existe na digitação).
- Flashcards com repetição espaçada (servem também para sintaxe de programação).
- Sprint de questões com tempo por questão.

### O que precisa mudar no app para ter trilhas

Hoje as 3 metas (estudo, digitação, leitura) estão fixas no código e no banco. Ter trilhas significa que **cada grupo escolhe as suas metas**. Essa é a refatoração grande, e é por ela que tudo passa.

## Ideias do Duolingo (sem engenharia reversa)

Mecânicas que o Duolingo já documenta publicamente e que faltam no Pacto:

- **Proteção de ofensiva:** perder um dia sem zerar a sequência. É a mais barata e a de maior efeito.
- **Ligas semanais** com promoção e rebaixamento (hoje o ranking é mensal).
- **Lembrete no horário em que a pessoa costuma fazer as metas** (hoje o horário é fixo).
- **Ofensiva em dupla.**

Cuidado: o Pacto já tem dívida real como punição. Somar proteção de ofensiva com ligas pode virar pressão demais para um grupo pequeno; escolher uma das duas.

## Outros projetos

### Fazendinha de programação

Aprender programação cuidando de uma fazenda: cada área é um conteúdo, e aprender coisas novas aumenta a fazenda.

- O ponto principal: **o código precisa fazer a fazenda funcionar** (um laço rega a fileira, uma condição colhe o que está maduro, uma função automatiza o galinheiro). Se a fazenda for só recompensa, vira enfeite.
- Já existe algo parecido: **The Farmer Was Replaced** (Steam). Jogar antes e achar o diferencial (ensino do zero, várias linguagens, celular).
- Rodar código no navegador: JavaScript (nativo), TypeScript (compilador oficial), Python (Pyodide), SQL (sql.js). Java é o difícil (CheerpJ ou um servidor de execução, que custa dinheiro).
- MVP: uma linguagem, uma área, cerca de 10 conceitos; testar com o grupo do Pacto.
- O gargalo vai ser conteúdo, não código.

## Cosméticos (brief do Astra, 30/10/2026)

Coleção de 8 para 18 objetos, em três PRs, um de cada vez:
- [x] **Arte (PR de arte):** 10 modelos em `tools/lowpoly/collectibles.js`, todos aprovados pelo Astra em 30/10 (prancha de 18). Lápis na versão longa; fone com conchas e arco mais claros; lendários extras `goldenJudgeBust` ("Encomendado por ele mesmo.") e `magistrateDuck` ("Promovido sem concurso."). O café seguiu uma referência de silhueta gerada no Gemini, só como referência. Para outra expansão: peruca cerimonial e toga reserva.
- [x] **Catálogo e ficha (#68):** 18 objetos, pesos 30/15/5, ficha e prateleira responsiva; 0027 rodada em produção. Frases dos 8 objetos antigos e texto do baú aprovados pelo Astra em 03/11.
- [x] **Abertura (PR de abertura):** resultado imediato, inclusive com movimento reduzido; texto neutro "Você recebeu" + nome (sem afirmar novo ou duplicata); "Este baú já foi aberto." quando outra aba abriu antes; item sobe em 4 passos, sem escala. 
- [ ] **"Novo na coleção" / "Mais um para a coleção"** (fase futura, precisa de migration): a `open_chest` teria de devolver, na mesma transação que grava, a ordem da abertura daquele item para a pessoa (1 = primeira cópia) e a quantidade confirmada, serializando por pessoa (`pg_advisory_xact_lock`) para dois baús diferentes abertos ao mesmo tempo não dizerem "novo" os dois. Testar: dois baús simultâneos com o mesmo item, resposta perdida e reconsulta. Até lá, texto neutro.
- Fora desta rodada: favoritos no perfil (exige tabela, posse e RLS), categorias na interface, roupas no juiz.

## Anexos e PR #63 (GXDZ1)

- [x] **Integração do #63** (PR #71, mergeado; 0028 rodada): anexos PDF/ZIP, link do GitHub obrigatório em projeto e sons na digitação ligados por padrão com botão para desligar (decisões do dono em 03/11), ajustes de layout e memória das fotos. Migration renumerada para 0028: rodar depois do merge.
- [x] **Retenção de 30 dias para PDF/ZIP** (0030): feita aqui, sem esperar a versão do GXDZ1; o arquivo sai, o nome fica e a prova diz que ele não está mais guardado.
- [ ] **13 textos de Bash em português e 13 em inglês**: existem só no computador do GXDZ1. Quando ele der push, conferir contra o catálogo do servidor (0022) e numerar a partir da 0031.
- [x] Cota de armazenamento: com a 0030, cada pessoa ocupa no máximo ~30 dias de anexos (até 10 MB por prova de estudo ou projeto). Acompanhar o uso do Storage no painel do Supabase.

## Hoje, mesa de trabalho (brief do Astra de 04/11/2026)

- [x] Poses estáticas: caderno com o canto levantado/assentado, livro aberto/fechado, teclado igual; tampo de 8 px; anulada com a pose de pendente; pendente mais claro (0,92/0,85).
- [x] Animação da tecla (05/11): a barra de espaço desce e volta (240 ms, 4 quadros) só na transição confirmada para "feita"; recarregar e movimento reduzido mostram o teclado parado.
- [x] Desktop: lateral "O grupo hoje" com Tribunal, Progresso e Ranking; máximo de 1160 px, 24 px entre as colunas, sem `sticky`; 1024 px continua em uma coluna.

## Tribunal vivo (brief do Astra de 04/11/2026)

- [x] PR 1: entrada do tribunal (uma batida de abertura, uma vez por pessoa e tribunal) e plateia genérica de costas; tribunal encerrado parado. Q1 = A e Q2 = A aplicadas pela recomendação; o dono pode reverter.
- [ ] PR 2 (depois do merge do PR 1): cédula entrando na urna (320 ms, 4 quadros, só após confirmação do servidor; nada em voto já registrado ou repetido) e batida única na transição ao vivo para encerrado (até 600 ms, resultado em texto antes do fim). Se voto e encerramento chegarem juntos, só o encerramento anima. Arte nova: urna e cédula em `tools/lowpoly`.
- [ ] Reserva, um PR por item e só com pedido: aba vinho da prova levantando (240 ms), juiz olhando a pasta enquanto a IA analisa (ciclo de 1,8 s só com processamento confirmado), canto do recibo dobrando no recebimento, juiz se recostando na folga.
- [x] Salão cheio (ajuste final do Astra de 04/11): cinco fileiras de costas no lugar da plateia de dois bancos, também no tribunal encerrado (Q4 = A); estático.
- [x] Movimento da multidão (05/11): pequenos grupos se ajeitam com atrasos diferentes junto com a batida, tudo parado até 1,2 s; uma vez por pessoa e tribunal, nunca com movimento reduzido.
- [ ] PR 2: **Q3 = A** (04/11), sem polling: a batida de encerramento só aparece quando o voto da própria pessoa encerra o tribunal.
- [ ] O carimbo "Condenado/Absolvido" ainda marca a pessoa (pendência antiga do Astra).

## Sessão de design do Astra (03/11/2026)

- [x] Bloco 1 (#71): textos e estados de anexos e som.
- [x] Bloco 3, autoria dos selos (#72); cena de entrada com **Q1 = C** (#75, 0029 rodada) (uma vez por pessoa e grupo, em todos os aparelhos): migration, política e texto dentro do `FirstSteps`.
- [x] Bloco 2, Perfil como arquivo no celular (#73); desktop pendente: o desktop em duas colunas (contêiner de 1120 px) volta para o Astra, porque o app inteiro usa uma coluna de até 640 px.
- **Q2 = A:** a coleção fica em 18; peruca, toga e os outros conceitos ficam reservados.
- **Q3 = A:** sem anistia no beta.
- Bloco 5 ("Novo na coleção") espera o contrato do servidor; bloco 7 (auditoria visual) espera capturas.
- A comentar com o Astra: o carimbo "Condenado"/"Absolvido" do tribunal marca a pessoa, e o brief diz para nunca carimbar usuário.

## Decisões em aberto

- **Auditoria de segurança, rodada 1 (29/10):** 6 falhas confirmadas corrigidas no PR da 0026. Ficam como pistas a validar no painel: Confirm email, inscrições push sem limite por pessoa, Storage sem limite total por membro (e órfãos de avatar/prova recusada), laço da limpeza se o `list()` do Storage casar prefixo sem diferenciar maiúsculas, limpezas do cron depois do loop de lembretes, nome de arquivo com `..`. Adiado: ranking/baús quando o tribunal muda depois, backups do Supabase, configurações reais do Storage, vazamento entre sites (COOP/CORP). Melhorias anotadas: fixar actions por SHA, `contents: write` só no passo de publicar, troca de senha, entrar no grupo só com e-mail confirmado, hosts exatos do push, nomes de foto no formato do `mediaPath`.
- **Dia da entrada não gera dívida (0025, 29/10):** antes, quem entrava à noite começava devendo às 23:59. Agora a dívida começa no dia seguinte; o dia da entrada, se cumprido, conta na sequência.
- **Vínculo da limpeza (0024):** a API passou a exigir que o grupo consultado ainda seja o grupo da alteração; reentrada/mudança durante a chamada não pode apagar fotos do grupo anterior. Testado com sessão válida e armazenamento real no laboratório. Não aplicado em produção.

- **Auditoria local (27/10):** protegidos os limites de IA/digitação, remoção de fotos, origem de requisições e RPC de cardápio. Migrações da auditoria agora 0019–0024, depois da pergunta do dia (0017) e do histórico de passagens (0018); nada publicado. Os testes reproduziram remoção pelo proprietário que já saiu e excesso de sessões extras simultâneas; corrigidos em 0023. Permanecem decisões de desenho: revogação de links de mídia/JWT já emitidos e validação de resultados de digitação autodeclarados. Os erros atuais do site/IA ainda dependem de confirmação nos logs de produção; não atribuir a uma indisponibilidade global sem evidência.

- **Código aberto?** Bom como portfólio, sem esperar que traga usuários. Licença MIT (portfólio) ou AGPL (se um dia quiser ganhar dinheiro). O histórico do git já foi varrido e não tem segredos.
- **Pontos do teste de 5 minutos:** hoje vale o melhor teste do dia de qualquer duração, então o de 5 minutos quase nunca conta. Mudar isso muda a regra.
- **Identidade jurídica (brief de 26/10):** passo 1 feito (PR #29) e revisado em 27/10: aprovado com ajustes (frase da data da foto, Feed no celular). Próximos: Perfil como arquivo mensal e pasta na cena de entrada; depois, autoria dos selos e legibilidade do tribunal. Para estudar: dossiê sem tribunal em duas colunas no desktop (foto à esquerda).
- **Link de commit na prova de estudo:** segundo passo da prova de estudo, só se a pergunta do dia não bastar contra trapaça. Usa a API do GitHub (serviço novo: atualizar a política no mesmo PR) e só serve para quem estuda programando.
- **Inglês na digitação:** rende mais WPM que português; os recordes são separados, mas os pontos não.

## Decisões já tomadas (para não rediscutir)

- Logo (27/10): o juiz do app em low poly, busto, fundo amarelo. Recusados: P em pixel art (o app é low poly, não pixel), P 3D com rosto (pouco caricato), martelo com cara (clichê jurídico).
- Penalidade: cardápio de 1 ou 2 itens; só o dono troca; a troca vale na segunda seguinte.
- Qualquer pessoa sem grupo pode criar um desafio; cada pessoa fica em um grupo só.
- Digitação: teste dentro do app (sem foto), 3 tentativas por dia, vale o melhor; PC e celular separados.
- Textos de digitação: só prosa, sem símbolos de código.
- Astra é o diretor de design: ideias visuais passam por ele.
- Prova de estudo (27/10, migration 0017): o resumo responde a uma pergunta do dia, sorteada por pessoa e dia (a mesma o dia todo). O juiz IA avalia a resposta (específica, vaga, fora do tema), mas isso só informa o grupo: o veredito e a acusação continuam vindo da foto.

## Código aberto (05/11/2026)

Preparado no repositório privado, para abrir num repositório público **novo** (um commit só, sem o histórico: o histórico antigo tem nomes de pessoas do beta, o e-mail pessoal nos commits e `node_modules` de um branch antigo).

- [x] Varredura de segredos no histórico inteiro (245 commits, 89 branches): nenhuma chave nos formatos de Supabase, Google, Resend, Sentry, GitHub, Stripe, Slack ou PEM; o único `.env` já commitado é o `.env.example`. (O `gitleaks` não pôde ser baixado na sessão; a varredura foi feita por padrões no `git log -p`.)
- [x] Revisão: RLS ligado nas 24 tabelas, `security definer` com `search_path`, views com `security_invoker`, `service_role` só no servidor, correções da auditoria de 29/10 presentes. CI sem segredos e sem `pull_request_target`.
- [x] Nomes de pessoas do beta tirados deste arquivo; README reescrito; `SECURITY.md`; licença AGPL-3.0 declarada no README e no `package.json`.
- [ ] Dono: pedir o "ok" do GXDZ1 para publicar o código dos anexos sob a AGPL.
- [ ] Dono: criar o repositório público novo a partir do `main`, adicionar o `LICENSE` pelo modelo do GitHub ("Add file → Create new file → LICENSE → Choose a license template → GNU AGPLv3") e ligar "Private vulnerability reporting" (Settings → Security).
- [ ] Dono: nos commits do repositório novo, usar o e-mail `noreply` do GitHub, não o pessoal.

