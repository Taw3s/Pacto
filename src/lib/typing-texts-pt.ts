// Texts for the typing test's "Texto" mode, in Portuguese. Loaded only when the test opens (see
// loadTypingTexts in typing-texts.ts). Prose only, no code symbols; a text's id is stored in
// typing_progress, so never rename one.
import type { TypingText } from "./typing-texts";

export const TEXTS: TypingText[] = [
  {
    lang: "pt",
    id: "algoritmo",
    category: "Fundamentos",
    title: "O que é um algoritmo",
    text:
      "Um algoritmo é uma sequência finita de passos bem definidos para resolver um problema. Uma receita de bolo é um algoritmo: " +
      "tem ingredientes de entrada, instruções em ordem e um resultado no final. Na programação, a ideia é a mesma, mas os passos " +
      "precisam ser tão precisos que uma máquina consiga segui-los sem interpretar nada. Um bom algoritmo sempre termina, dá a " +
      "resposta certa para qualquer entrada válida e não gasta mais tempo nem memória do que o necessário. Por isso, dois " +
      "algoritmos podem resolver o mesmo problema e ainda assim ser muito diferentes: procurar um nome numa lista olhando item por " +
      "item funciona, mas numa lista ordenada é muito mais rápido abrir no meio e descartar metade a cada passo. Essa busca se " +
      "chama busca binária, e mostra que pensar antes de escrever o código costuma valer mais do que digitar rápido.",
  },
  {
    lang: "pt",
    id: "variavel",
    category: "Fundamentos",
    title: "Variáveis e tipos",
    text:
      "Uma variável é um nome que aponta para um valor guardado na memória. Em vez de repetir o número da idade de alguém em vários " +
      "lugares, o programa guarda esse número uma vez e usa o nome sempre que precisar dele. Todo valor tem um tipo, que diz o que " +
      "ele representa e o que se pode fazer com ele. Números inteiros podem ser somados, textos podem ser juntados, valores lógicos " +
      "são apenas verdadeiro ou falso. Algumas linguagens exigem que o tipo de cada variável seja declarado e conferem tudo antes " +
      "de o programa rodar; outras descobrem o tipo enquanto o programa executa. A primeira forma pega muitos erros cedo, a segunda " +
      "deixa escrever mais rápido. Escolher bons nomes para as variáveis parece detalhe, mas é uma das coisas que mais tornam um " +
      "código fácil de ler meses depois.",
  },
  {
    lang: "pt",
    id: "funcao",
    category: "Fundamentos",
    title: "Funções",
    text:
      "Uma função é um bloco de código com nome que recebe dados, faz um trabalho e devolve um resultado. Ela existe para evitar " +
      "repetição e para dar nome a uma ideia. Quando um cálculo de frete aparece em três telas, escrever esse cálculo uma única vez " +
      "dentro de uma função garante que todas as telas mudem juntas quando a regra mudar. Os dados que a função recebe se chamam " +
      "parâmetros. Uma função pura é aquela que, para as mesmas entradas, sempre devolve a mesma saída e não altera nada fora dela; " +
      "funções assim são fáceis de testar e de entender. Funções pequenas, que fazem uma coisa só, costumam ser mais fáceis de " +
      "reaproveitar. Quando o nome de uma função precisa de um e no meio para descrever o que ela faz, é um bom sinal de que ela " +
      "deveria ser dividida em duas.",
  },
  {
    lang: "pt",
    id: "complexidade",
    category: "Fundamentos",
    title: "Complexidade de algoritmos",
    text:
      "A complexidade de um algoritmo descreve como o tempo ou a memória que ele usa crescem quando a entrada cresce. Não importa se " +
      "uma lista de dez itens é processada em um ou dois milissegundos; importa o que acontece com um milhão de itens. Um algoritmo " +
      "linear faz um trabalho proporcional ao tamanho da entrada. Um quadrático, como comparar cada item com todos os outros, fica " +
      "cem vezes mais lento quando a entrada fica dez vezes maior. Já a busca binária é logarítmica: dobrar a lista acrescenta só " +
      "mais um passo. Essa forma de medir ignora detalhes da máquina e foca no formato do crescimento, por isso é chamada de análise " +
      "assintótica. Na prática, ela ajuda a perceber cedo quando uma solução que funciona bem nos testes vai travar quando os dados " +
      "reais chegarem.",
  },
  {
    lang: "pt",
    id: "api",
    category: "Fundamentos",
    title: "O que é uma API",
    text:
      "API quer dizer interface de programação de aplicações. É um contrato que diz como um programa pode pedir algo a outro: quais " +
      "pedidos existem, quais dados enviar e o que volta como resposta. Quando um aplicativo de clima mostra a previsão, ele " +
      "provavelmente pediu esses dados à API de um serviço de meteorologia. O aplicativo não precisa saber como o serviço calcula a " +
      "previsão, só precisa seguir o contrato. Essa separação é o que permite que sistemas diferentes, escritos em linguagens " +
      "diferentes, conversem entre si. Uma boa API é estável, bem documentada e difícil de usar errado. Mudar um contrato que outras " +
      "pessoas já usam quebra os programas delas, por isso APIs públicas costumam ganhar versões novas em vez de mudar as antigas.",
  },
  {
    lang: "pt",
    id: "http",
    category: "Fundamentos",
    title: "Como funciona o HTTP",
    text:
      "HTTP é o protocolo que o navegador usa para conversar com servidores. Cada conversa é um pedido seguido de uma resposta. O " +
      "pedido diz o que se quer, usando um método: GET para buscar algo, POST para enviar dados novos, PUT ou PATCH para alterar, " +
      "DELETE para apagar. A resposta traz um código de status, como duzentos quando deu tudo certo, quatrocentos e quatro quando o " +
      "endereço não existe e quinhentos quando o servidor falhou. Pedidos e respostas também levam cabeçalhos, que são informações " +
      "extras como o tipo do conteúdo ou o token de quem está logado. O HTTP não guarda memória entre um pedido e outro, então o " +
      "servidor só sabe quem você é porque cada pedido carrega essa prova. A versão segura, HTTPS, criptografa tudo no caminho.",
  },
  {
    lang: "pt",
    id: "git",
    category: "Fundamentos",
    title: "Git e controle de versão",
    text:
      "Git é um sistema de controle de versão: ele guarda o histórico de um projeto como uma série de fotografias chamadas commits. " +
      "Cada commit registra o que mudou, quem mudou e por quê, então é possível voltar no tempo, comparar versões e descobrir quando " +
      "um erro apareceu. Branches são linhas paralelas de trabalho. Uma pessoa pode criar uma branch para uma funcionalidade nova " +
      "sem mexer na versão que está em produção, e só juntar as duas quando o trabalho estiver pronto. Essa junção se chama merge. " +
      "Quando duas pessoas alteram a mesma linha, o Git não adivinha qual mudança vale e pede que alguém resolva o conflito. Commits " +
      "pequenos, com mensagens claras, transformam o histórico numa documentação de como o projeto chegou até aqui.",
  },
  {
    lang: "pt",
    id: "compilador-interpretador",
    category: "Fundamentos",
    title: "Compilador e interpretador",
    text:
      "O computador só entende instruções de máquina, então o código que escrevemos precisa ser traduzido. Um compilador traduz o " +
      "programa inteiro de uma vez, antes de ele rodar, e gera um arquivo executável. Linguagens como C, Go e Rust funcionam assim, " +
      "e por isso costumam ser rápidas e acusar muitos erros antes da execução. Um interpretador lê e executa o código aos poucos, " +
      "enquanto o programa roda, o que deixa testar ideias muito rápido. Na prática, a fronteira é borrada. Java é compilado para um " +
      "código intermediário que uma máquina virtual executa, e os motores de JavaScript dos navegadores compilam durante a execução " +
      "os trechos mais usados para ganhar velocidade. A pergunta útil não é se a linguagem é compilada, e sim quando cada erro vai " +
      "aparecer.",
  },
  {
    lang: "pt",
    id: "nuvem",
    category: "Fundamentos",
    title: "O que é a nuvem",
    text:
      "A nuvem é o uso de computadores de outra empresa pela internet, pagando pelo que se usa. Em vez de comprar servidores, " +
      "instalar e manter tudo numa sala, uma equipe aluga capacidade de provedores que têm centros de dados espalhados pelo mundo. " +
      "Existem níveis diferentes de serviço. No mais básico, você aluga máquinas virtuais e cuida de todo o resto. Em serviços " +
      "gerenciados, o provedor cuida do banco de dados, das cópias de segurança e das atualizações. No modelo sem servidor, você só " +
      "envia o código e ele roda quando alguém faz um pedido. A grande vantagem é poder crescer ou diminuir em minutos. O cuidado é " +
      "com a conta: recursos esquecidos ligados continuam custando, e configurar mal uma permissão pode deixar dados expostos para " +
      "qualquer pessoa.",
  },
  {
    lang: "pt",
    id: "senhas",
    category: "Fundamentos",
    title: "Como guardar senhas",
    text:
      "Um sistema nunca deveria guardar a senha das pessoas como ela foi digitada. Se o banco de dados vazar, todas as contas ficam " +
      "expostas, e como muita gente repete senhas, o estrago vai além daquele site. O certo é guardar um hash, que é o resultado de " +
      "uma função de mão única: é fácil calcular o hash a partir da senha, mas inviável fazer o caminho inverso. No login, o sistema " +
      "calcula o hash do que foi digitado e compara com o guardado. Cada senha também recebe um sal, um valor aleatório que impede " +
      "que duas senhas iguais tenham o mesmo hash. Funções feitas para isso, como bcrypt e argon2, são lentas de propósito, para que " +
      "testar milhões de tentativas fique caro demais para um atacante.",
  },
  {
    lang: "pt",
    id: "sql-o-que-e",
    category: "SQL e dados",
    title: "O que é SQL",
    text:
      "SQL é a linguagem usada para conversar com bancos de dados relacionais. Nesses bancos, os dados ficam em tabelas, com linhas " +
      "e colunas, parecidas com uma planilha bem organizada. Com SQL você descreve o que quer, e não como buscar. Por exemplo, pedir " +
      "todos os alunos com nota acima de sete, ordenados pelo nome, é uma única instrução; o banco decide sozinho o caminho mais " +
      "rápido para encontrar essas linhas. As instruções mais comuns são SELECT para consultar, INSERT para incluir, UPDATE para " +
      "alterar e DELETE para apagar. Também é possível juntar tabelas diferentes numa mesma consulta, combinando, por exemplo, cada " +
      "pedido com o cliente que o fez. Mesmo com tantas tecnologias novas, SQL continua sendo uma das habilidades mais úteis para " +
      "quem trabalha com dados.",
  },
  {
    lang: "pt",
    id: "sql-chaves",
    category: "SQL e dados",
    title: "Chaves primárias e estrangeiras",
    text:
      "Toda tabela bem desenhada tem uma chave primária, uma coluna cujo valor identifica cada linha de forma única. Pode ser um " +
      "número que cresce sozinho ou um identificador aleatório. Nome e email são escolhas ruins, porque mudam. Uma chave " +
      "estrangeira é uma coluna que aponta para a chave primária de outra tabela. Na tabela de pedidos, a coluna do cliente guarda " +
      "o identificador de alguém da tabela de clientes. O banco passa a garantir essa ligação: ele recusa um pedido para um cliente " +
      "que não existe e pode impedir que um cliente com pedidos seja apagado, ou apagar os pedidos junto, conforme a regra " +
      "escolhida. Essa garantia se chama integridade referencial. Ela tira do código da aplicação a responsabilidade de manter os " +
      "dados coerentes, porque nenhum programa consegue gravar uma ligação quebrada.",
  },
  {
    lang: "pt",
    id: "sql-indices",
    category: "SQL e dados",
    title: "Índices em bancos de dados",
    text:
      "Sem um índice, para encontrar as linhas de um cliente o banco precisa ler a tabela inteira, linha por linha. Com poucas " +
      "linhas isso não importa, mas com milhões vira um problema. Um índice funciona como o índice remissivo de um livro: uma " +
      "estrutura ordenada que diz onde está cada valor, geralmente organizada como uma árvore que permite chegar ao dado em poucos " +
      "passos. Índices deixam as consultas muito mais rápidas, mas não são de graça. Eles ocupam espaço e precisam ser atualizados a " +
      "cada inclusão ou alteração, o que deixa as escritas um pouco mais lentas. Por isso, a regra é criar índices para as colunas " +
      "mais usadas em filtros, junções e ordenações, e conferir com o plano de execução se o banco está mesmo usando o índice que " +
      "você criou.",
  },
  {
    lang: "pt",
    id: "sql-transacoes",
    category: "SQL e dados",
    title: "Transações",
    text:
      "Uma transação agrupa várias operações num bloco que acontece por inteiro ou não acontece. O exemplo clássico é uma " +
      "transferência bancária: tirar dinheiro de uma conta e colocar na outra são dois passos, e seria um desastre se só o primeiro " +
      "acontecesse por causa de uma queda de energia. Dentro de uma transação, se algo falhar, tudo é desfeito com um rollback; se " +
      "der certo, o commit confirma todas as mudanças de uma vez. Os bancos relacionais prometem quatro propriedades, conhecidas " +
      "pela sigla ACID: atomicidade, consistência, isolamento e durabilidade. O isolamento é o mais sutil, porque define o que uma " +
      "transação enxerga das outras que estão rodando ao mesmo tempo, e níveis mais rígidos trazem mais segurança ao custo de " +
      "desempenho.",
  },
  {
    lang: "pt",
    id: "python-intro",
    category: "Python",
    title: "Por que Python é tão popular",
    text:
      "Python é uma linguagem criada por Guido van Rossum e lançada em mil novecentos e noventa e um. Ela ficou famosa por ser fácil " +
      "de ler: os blocos de código são definidos pela indentação, e não por símbolos, o que obriga o código a ter uma aparência " +
      "organizada. Python é interpretada e tem tipagem dinâmica, então dá para testar ideias rapidamente no terminal. Sua maior " +
      "força está no ecossistema. Existem bibliotecas prontas para análise de dados, aprendizado de máquina, automação de tarefas, " +
      "desenvolvimento web e computação científica. Por isso a mesma linguagem é usada por cientistas, analistas e engenheiros de " +
      "software. A filosofia da linguagem diz que deveria haver uma forma óbvia de fazer cada coisa, e que legibilidade conta. O " +
      "preço da simplicidade é a velocidade, menor que a de linguagens compiladas.",
  },
  {
    lang: "pt",
    id: "python-listas",
    category: "Python",
    title: "Listas e dicionários em Python",
    text:
      "Em Python, as duas estruturas de dados mais usadas são a lista e o dicionário. Uma lista guarda itens em ordem e permite " +
      "acessá-los pela posição, começando do zero. Ela pode crescer, encolher e misturar tipos diferentes, e é ideal quando a ordem " +
      "importa. Um dicionário guarda pares de chave e valor, como um nome associado a um telefone. Buscar um valor pela chave é " +
      "muito rápido, mesmo com milhões de itens, porque o dicionário usa uma tabela de espalhamento por baixo. Python ainda oferece " +
      "tuplas, que são listas que não podem ser alteradas, e conjuntos, que guardam itens sem repetição. Escolher a estrutura certa " +
      "muda tudo: verificar se um nome está numa lista exige olhar item por item, enquanto num conjunto a resposta vem quase " +
      "instantaneamente.",
  },
  {
    lang: "pt",
    id: "js-intro",
    category: "JavaScript",
    title: "A história do JavaScript",
    text:
      "JavaScript foi criado em mil novecentos e noventa e cinco por Brendan Eich, em cerca de dez dias, para dar interatividade às " +
      "páginas do navegador Netscape. Apesar do nome, não tem relação com Java; o nome foi uma jogada de marketing da época. Hoje " +
      "ele é a única linguagem que todos os navegadores executam de forma nativa, e por isso está em praticamente todo site. Com o " +
      "Node.js, passou a rodar também em servidores, e uma mesma equipe pode escrever as duas pontas de uma aplicação. A linguagem " +
      "é padronizada com o nome ECMAScript e ganha novidades todos os anos. Muitos projetos usam TypeScript, que acrescenta tipos ao " +
      "JavaScript e acusa erros antes de o código rodar, sem mudar o que acontece no navegador.",
  },
  {
    lang: "pt",
    id: "js-assincrono",
    category: "JavaScript",
    title: "JavaScript assíncrono",
    text:
      "JavaScript executa uma coisa de cada vez, numa única linha de execução. Se cada pedido à internet travasse o programa até a " +
      "resposta chegar, a página congelaria. A solução é o modelo assíncrono. Quando o código pede algo demorado, como dados de um " +
      "servidor, ele registra o que fazer quando a resposta chegar e segue em frente. Um mecanismo chamado laço de eventos fica " +
      "conferindo quais tarefas terminaram e executa a continuação de cada uma. As promessas representam um valor que ainda vai " +
      "existir, e as palavras async e await permitem escrever esse fluxo como se fosse uma sequência normal, de cima para baixo. O " +
      "erro mais comum de quem está começando é esquecer de esperar uma promessa e usar um resultado que ainda não chegou.",
  },
  {
    lang: "pt",
    id: "html-css",
    category: "Web",
    title: "HTML e CSS",
    text:
      "Toda página web começa com HTML, a linguagem que descreve a estrutura do conteúdo: o que é título, o que é parágrafo, onde " +
      "há uma lista, uma imagem ou um botão. HTML não é uma linguagem de programação, porque não tem lógica nem decisões; ela marca " +
      "o significado de cada parte. Usar a marcação certa importa, porque leitores de tela e mecanismos de busca dependem dela para " +
      "entender a página. O CSS cuida da aparência: cores, fontes, espaçamentos e a disposição dos elementos na tela. Separar " +
      "estrutura de estilo permite mudar o visual de um site inteiro sem tocar no conteúdo. Com recursos como flexbox e grid, e com " +
      "regras que mudam conforme a largura da tela, o mesmo HTML se adapta a um celular e a um monitor grande.",
  },
  {
    lang: "pt",
    id: "web-navegador",
    category: "Web",
    title: "O que acontece ao abrir um site",
    text:
      "Quando você digita um endereço e aperta enter, muita coisa acontece em menos de um segundo. Primeiro, o navegador pergunta ao " +
      "DNS qual é o endereço numérico do servidor daquele nome. Depois abre uma conexão com ele e, se o site usa HTTPS, os dois " +
      "combinam uma chave para criptografar a conversa. Então o navegador pede a página, e o servidor responde com o HTML. Ao ler " +
      "esse HTML, o navegador descobre que precisa de outros arquivos, como estilos, scripts e imagens, e pede cada um deles. Com " +
      "tudo em mãos, monta a árvore de elementos, calcula onde cada coisa fica e pinta a tela. Por isso sites rápidos se preocupam " +
      "em enviar menos arquivos e arquivos menores, e em mostrar o conteúdo principal antes do resto.",
  },
  {
    lang: "pt",
    id: "redes",
    category: "Fundamentos",
    title: "Como os computadores conversam",
    text:
      "Para dois computadores trocarem dados pela internet, a mensagem é quebrada em pequenos pacotes. Cada pacote carrega o " +
      "endereço IP de origem e de destino, como um envelope com remetente e destinatário. Os roteadores leem esse endereço e " +
      "passam o pacote adiante, por caminhos que podem mudar no meio do trajeto, até ele chegar ao computador certo. Por cima " +
      "do IP funciona o TCP, que numera os pacotes, confere se todos chegaram, pede de novo os que se perderam e entrega tudo " +
      "na ordem correta. Quando a velocidade importa mais do que a garantia, como em chamadas de vídeo e jogos online, usa-se o " +
      "UDP, que envia sem confirmar a entrega. Dentro de um mesmo computador, as portas indicam qual programa deve receber cada " +
      "pacote: a porta quatrocentos e quarenta e três, por exemplo, costuma ser a do HTTPS.",
  },
  {
    lang: "pt",
    id: "terminal",
    category: "Fundamentos",
    title: "O terminal e a linha de comando",
    text:
      "O terminal é uma janela onde você conversa com o computador por texto, digitando comandos em vez de clicar em botões. " +
      "Por trás dele roda um programa chamado shell, como o Bash ou o Zsh, que interpreta cada linha e executa o programa " +
      "pedido. Parece antiquado, mas tem vantagens enormes: um comando pode ser repetido, guardado num script e combinado com " +
      "outros. A saída de um programa pode virar a entrada do próximo, então tarefas como procurar uma palavra em mil arquivos " +
      "ou renomear centenas de fotos viram uma única linha. Quase todo servidor na nuvem roda Linux sem interface gráfica, e a " +
      "única forma de administrar essas máquinas é pela linha de comando. Ferramentas como Git, gerenciadores de pacotes e " +
      "compiladores também nasceram para o terminal. Aprender uma dúzia de comandos básicos já muda muito a velocidade do dia a " +
      "dia de quem programa.",
  },
  {
    lang: "pt",
    id: "testes",
    category: "Fundamentos",
    title: "Testes automatizados",
    text:
      "Um teste automatizado é um pequeno programa que verifica se outro programa faz o que deveria. Em vez de abrir o " +
      "aplicativo e clicar em tudo depois de cada mudança, você escreve uma vez o que espera e o computador confere em " +
      "segundos. Os testes de unidade checam uma função isolada, com entradas e saídas conhecidas. Os testes de integração " +
      "verificam se várias partes funcionam juntas, como o código e o banco de dados. Os testes de ponta a ponta simulam uma " +
      "pessoa usando o sistema de verdade, num navegador. Quanto mais alto o nível, mais confiança o teste dá e mais lento e " +
      "frágil ele costuma ser. O grande valor dos testes aparece meses depois, quando alguém altera uma parte do código e " +
      "descobre na hora que quebrou outra. Sem eles, cada mudança vira uma aposta, e o medo de mexer deixa o projeto parado.",
  },
  {
    lang: "pt",
    id: "seguranca",
    category: "Fundamentos",
    title: "Injeção e entrada de usuário",
    text:
      "Uma das falhas de segurança mais antigas e ainda comuns é a injeção. Ela acontece quando um programa junta texto " +
      "digitado pelo usuário diretamente a um comando, como uma consulta ao banco de dados. Se alguém digitar, no lugar do " +
      "nome, um trecho de SQL bem montado, o banco pode executar esse trecho como se fosse parte da consulta original e " +
      "devolver ou apagar dados que não deveria. A defesa é nunca montar comandos colando textos. As bibliotecas oferecem " +
      "consultas parametrizadas, em que o comando e os valores viajam separados, e o banco trata o valor sempre como dado, " +
      "nunca como instrução. A mesma ideia vale para páginas web: texto vindo do usuário precisa ser escapado antes de aparecer " +
      "na tela, senão vira código executado no navegador de outras pessoas. A regra geral é simples: toda entrada externa é " +
      "suspeita até ser validada.",
  },
  {
    lang: "pt",
    id: "sql-joins",
    category: "SQL e dados",
    title: "Juntando tabelas com JOIN",
    text:
      "Num banco relacional, as informações ficam separadas em tabelas para não se repetirem. Os clientes ficam numa tabela, os " +
      "pedidos em outra, e cada pedido guarda só o identificador do cliente. Para ver o nome do cliente ao lado de cada pedido, " +
      "usa-se o JOIN, que junta linhas de tabelas diferentes a partir de uma condição, normalmente a igualdade entre a chave " +
      "estrangeira e a chave primária. O INNER JOIN devolve apenas as combinações que existem nos dois lados: pedidos sem " +
      "cliente e clientes sem pedido ficam de fora. O LEFT JOIN mantém todas as linhas da tabela da esquerda e preenche com " +
      "nulo o que não tiver par, o que é útil para encontrar, por exemplo, clientes que nunca compraram. Existe ainda o FULL " +
      "JOIN, que mantém tudo dos dois lados. Escolher o tipo errado de junção é uma das causas mais comuns de relatórios com " +
      "números faltando.",
  },
  {
    lang: "pt",
    id: "sql-group-by",
    category: "SQL e dados",
    title: "Agrupando com GROUP BY",
    text:
      "Muitas perguntas sobre dados não pedem linhas individuais, e sim resumos: quanto cada cliente gastou no mês, quantos " +
      "pedidos saíram por dia, qual a nota média de cada turma. Para isso existe o GROUP BY. Ele reúne as linhas que têm o " +
      "mesmo valor numa ou mais colunas e permite aplicar funções de agregação a cada grupo, como COUNT para contar, SUM para " +
      "somar, AVG para a média e MAX ou MIN para os extremos. Uma regra importante: toda coluna que aparece no resultado " +
      "precisa estar no agrupamento ou dentro de uma função de agregação, porque o banco não saberia qual valor mostrar. Para " +
      "filtrar linhas antes de agrupar, usa-se WHERE. Para filtrar os grupos depois de calculados, como mostrar só clientes com " +
      "mais de cinco pedidos, usa-se HAVING. Confundir os dois é um erro clássico de quem está começando.",
  },
  {
    lang: "pt",
    id: "sql-subconsultas",
    category: "SQL e dados",
    title: "Subconsultas e CTEs",
    text:
      "Uma subconsulta é uma consulta dentro de outra. Ela permite responder perguntas em etapas, como listar os produtos com " +
      "preço acima da média: primeiro calcula-se a média e depois compara-se cada produto com ela. Subconsultas podem aparecer " +
      "no filtro, no lugar de uma tabela ou até no lugar de um valor. Quando a lógica cresce, várias subconsultas aninhadas " +
      "ficam difíceis de ler. Por isso existem as expressões de tabela comuns, conhecidas como CTE, escritas com a palavra " +
      "WITH. Elas dão um nome a cada etapa no começo da consulta, e a parte final usa esses nomes como se fossem tabelas. O " +
      "resultado costuma ser o mesmo, mas a leitura fica de cima para baixo, como uma receita. Alguns bancos também aceitam " +
      "CTEs recursivas, úteis para percorrer hierarquias, como as categorias de uma loja ou o organograma de uma empresa.",
  },
  {
    lang: "pt",
    id: "sql-normalizacao",
    category: "SQL e dados",
    title: "Normalização de dados",
    text:
      "Normalizar um banco de dados é organizar as tabelas para que cada informação fique guardada em um único lugar. Imagine " +
      "uma planilha de pedidos que repete o endereço do cliente em todas as linhas. Se o cliente mudar de endereço, é preciso " +
      "alterar dezenas de linhas, e basta esquecer uma para os dados ficarem contraditórios. Na versão normalizada, o endereço " +
      "fica na tabela de clientes e os pedidos apenas apontam para o cliente. As formas normais são regras que descrevem esse " +
      "processo em níveis: cada coluna guarda um valor só, cada informação depende da chave inteira, e nenhuma coluna depende " +
      "de outra coluna que não seja a chave. Normalizar demais, porém, obriga a juntar muitas tabelas em toda consulta. Em " +
      "sistemas de relatórios, é comum fazer o caminho inverso de propósito, repetindo alguns dados para ganhar velocidade de " +
      "leitura.",
  },
  {
    lang: "pt",
    id: "sql-nulo",
    category: "SQL e dados",
    title: "O valor nulo",
    text:
      "Em SQL, nulo não é zero nem texto vazio: significa que o valor é desconhecido ou não existe. Essa diferença tem " +
      "consequências que pegam muita gente de surpresa. Qualquer comparação com nulo dá como resultado também desconhecido, e " +
      "não verdadeiro nem falso. Por isso, um filtro que pergunta se uma coluna é igual a nulo nunca encontra nada; o certo é " +
      "usar IS NULL ou IS NOT NULL. Somar um número com nulo resulta em nulo. As funções de agregação, como a média, " +
      "simplesmente ignoram os nulos, o que pode mudar o resultado sem aviso. Para trocar um nulo por um valor padrão na hora " +
      "de mostrar, existe a função COALESCE. Ao desenhar uma tabela, vale decidir com cuidado quais colunas podem ficar sem " +
      "valor e marcar as outras como obrigatórias, deixando o próprio banco recusar dados incompletos.",
  },
  {
    lang: "pt",
    id: "sql-nosql",
    category: "SQL e dados",
    title: "Relacional ou NoSQL",
    text:
      "Bancos relacionais guardam dados em tabelas com colunas definidas e relações garantidas por chaves. Bancos chamados " +
      "NoSQL abrem mão de parte dessas regras em troca de outras vantagens. Os bancos de documentos guardam cada registro como " +
      "um documento flexível, que pode ter campos diferentes dos outros. Os de chave e valor funcionam como um dicionário " +
      "gigante e são extremamente rápidos para leituras simples, por isso aparecem muito como cache. Há ainda bancos de grafos, " +
      "feitos para relações complexas, como redes sociais. A escolha depende do problema, não da moda. Quando os dados têm " +
      "muitas relações e precisam de consistência, como num sistema financeiro, o relacional costuma ser a melhor opção. Quando " +
      "o formato muda o tempo todo ou o volume é enorme e as consultas são simples, o NoSQL pode ser mais prático. Muitos " +
      "sistemas usam os dois ao mesmo tempo.",
  },
  {
    lang: "pt",
    id: "python-funcoes",
    category: "Python",
    title: "Funções em Python",
    text:
      "Em Python, uma função é criada com a palavra def, seguida do nome e dos parâmetros, e o corpo é definido pela " +
      "indentação. Os parâmetros podem ter valores padrão, o que permite chamar a função com menos argumentos. Também é " +
      "possível passar argumentos pelo nome, deixando a chamada mais clara quando há muitos parâmetros. Uma função pode " +
      "devolver vários valores de uma vez, que chegam juntos numa tupla. Em Python, funções são objetos como quaisquer outros: " +
      "podem ser guardadas em variáveis, passadas para outras funções e devolvidas como resultado. É isso que permite os " +
      "decoradores, funções que envolvem outras para acrescentar comportamento, como medir tempo ou checar permissões. Um " +
      "cuidado clássico: nunca use uma lista vazia como valor padrão de um parâmetro, porque ela é criada uma única vez e passa " +
      "a ser compartilhada entre todas as chamadas da função.",
  },
  {
    lang: "pt",
    id: "python-classes",
    category: "Python",
    title: "Classes e objetos em Python",
    text:
      "Uma classe é um molde para criar objetos que reúnem dados e comportamentos. Em Python, o método especial init é chamado " +
      "quando um objeto nasce e costuma preparar seus atributos. Todo método recebe como primeiro parâmetro o próprio objeto, " +
      "por convenção chamado self, e é por ele que se acessam os atributos. Uma classe pode herdar de outra e reaproveitar seus " +
      "métodos, alterando apenas o que precisa ser diferente. Python também tem métodos especiais, com dois sublinhados antes e " +
      "depois do nome, que permitem que objetos próprios se comportem como tipos nativos: podem ser somados, comparados, " +
      "impressos de um jeito legível ou percorridos num laço. Para classes que só guardam dados, o módulo dataclasses gera " +
      "automaticamente o construtor e a comparação. Ainda assim, em Python nem tudo precisa ser classe: muitas vezes uma função " +
      "simples resolve melhor.",
  },
  {
    lang: "pt",
    id: "python-compreensoes",
    category: "Python",
    title: "Compreensões de lista",
    text:
      "As compreensões de lista são uma das marcas do Python. Elas criam uma lista nova a partir de outra numa única expressão, " +
      "descrevendo o que fazer com cada item e, opcionalmente, quais itens manter. Por exemplo, é possível gerar os quadrados " +
      "dos números pares de uma lista em uma linha curta e legível, sem precisar declarar uma lista vazia e preencher num laço. " +
      "A mesma ideia vale para dicionários e conjuntos. Quando a compreensão é escrita com parênteses em vez de colchetes, ela " +
      "vira um gerador: os valores são produzidos um de cada vez, sob demanda, sem ocupar memória com a lista inteira. Isso faz " +
      "diferença ao processar arquivos enormes. O limite é a legibilidade: compreensões com várias condições e laços aninhados " +
      "ficam difíceis de entender, e nesse caso um laço comum é a escolha mais honesta.",
  },
  {
    lang: "pt",
    id: "python-venv",
    category: "Python",
    title: "Ambientes virtuais e pip",
    text:
      "Projetos diferentes costumam precisar de versões diferentes das mesmas bibliotecas. Se tudo for instalado no Python do " +
      "sistema, mais cedo ou mais tarde um projeto quebra o outro. A solução é o ambiente virtual: uma pasta com um Python " +
      "isolado e suas próprias bibliotecas, criada pelo módulo venv. Depois de ativado, tudo o que se instala vai para dentro " +
      "dele. As bibliotecas são instaladas com o pip, que busca os pacotes no repositório público chamado PyPI. Para que outra " +
      "pessoa consiga recriar o mesmo ambiente, as dependências e suas versões são anotadas num arquivo, tradicionalmente o " +
      "requirements, ou no pyproject, mais moderno. Ferramentas mais novas, como Poetry e uv, automatizam esse processo e " +
      "travam as versões exatas. A pasta do ambiente virtual não vai para o Git: quem clona o projeto cria o seu próprio.",
  },
  {
    lang: "pt",
    id: "python-excecoes",
    category: "Python",
    title: "Tratando erros em Python",
    text:
      "Quando algo dá errado durante a execução, como abrir um arquivo que não existe ou dividir por zero, o Python lança uma " +
      "exceção. Se ninguém tratar, o programa para e mostra o caminho de chamadas até o erro, o traceback, que é a primeira " +
      "coisa a ler na hora de depurar. Para tratar, usa-se try: o código arriscado fica dentro do bloco, e o except define o " +
      "que fazer se uma exceção específica acontecer. Existe ainda o else, que roda quando nada falhou, e o finally, que roda " +
      "sempre, ideal para liberar recursos. Uma boa prática é capturar apenas os erros que você sabe resolver, e nunca engolir " +
      "todas as exceções em silêncio, porque isso esconde bugs. Para arquivos e conexões, o comando with garante o fechamento " +
      "automático mesmo quando acontece um erro no meio do caminho.",
  },
  {
    lang: "pt",
    id: "python-pandas",
    category: "Python",
    title: "Análise de dados com pandas",
    text:
      "O pandas é a biblioteca mais usada para analisar dados em Python. Sua estrutura principal é o DataFrame, uma tabela com " +
      "linhas e colunas nomeadas, parecida com uma planilha, mas manipulada por código. Em poucas linhas é possível ler um " +
      "arquivo CSV ou uma planilha, filtrar linhas por condição, criar colunas calculadas, agrupar e resumir valores, juntar " +
      "tabelas e exportar o resultado. Por baixo, o pandas usa o NumPy, que guarda os números em blocos contínuos de memória e " +
      "faz as contas em código compilado, por isso operações sobre colunas inteiras são muito mais rápidas do que laços " +
      "escritos à mão. A regra de ouro é pensar em colunas, não em linhas: aplicar uma operação na coluna toda de uma vez. Para " +
      "conjuntos realmente grandes, que não cabem na memória, existem alternativas como o Polars e o DuckDB.",
  },
  {
    lang: "pt",
    id: "js-closures",
    category: "JavaScript",
    title: "Escopo e closures",
    text:
      "Em JavaScript, toda função lembra o lugar onde foi criada. Se uma função é definida dentro de outra, ela continua tendo " +
      "acesso às variáveis da função de fora mesmo depois que essa função terminou. Esse mecanismo se chama closure. Ele é " +
      "usado o tempo todo, muitas vezes sem que a gente perceba: em funções que guardam um contador privado, em manipuladores " +
      "de eventos que precisam de dados da página e em funções criadas sob medida a partir de uma configuração. O escopo também " +
      "explica a diferença entre var, let e const. Variáveis declaradas com var pertencem à função inteira, o que causava bugs " +
      "famosos dentro de laços. Já let e const pertencem apenas ao bloco onde foram declaradas, e const impede que a variável " +
      "seja reatribuída. Hoje, a recomendação geral é usar const sempre que possível e let quando o valor precisa mudar.",
  },
  {
    lang: "pt",
    id: "js-dom",
    category: "JavaScript",
    title: "O DOM e os eventos",
    text:
      "Quando o navegador lê uma página, ele transforma o HTML numa árvore de objetos chamada DOM. O JavaScript conversa com a " +
      "página por meio dessa árvore: pode encontrar elementos, mudar textos, trocar estilos, criar ou remover partes da tela. A " +
      "interatividade vem dos eventos. Um clique, uma tecla pressionada, o envio de um formulário ou o fim do carregamento de " +
      "uma imagem geram eventos, e o código registra funções para reagir a cada um deles. Os eventos sobem pela árvore, do " +
      "elemento clicado até a raiz, o que permite tratar cliques de uma lista inteira com um único ouvinte no elemento pai. " +
      "Mexer no DOM tem custo, porque o navegador pode precisar recalcular o layout. Por isso bibliotecas como React mantêm uma " +
      "representação da tela na memória e aplicam ao DOM apenas as diferenças necessárias.",
  },
  {
    lang: "pt",
    id: "web-rest",
    category: "Web",
    title: "APIs REST",
    text:
      "REST é um estilo de construir APIs na web que aproveita o próprio HTTP. Cada coisa do sistema, como um usuário ou um " +
      "pedido, é um recurso com um endereço próprio. As ações são expressas pelos métodos do HTTP: GET para ler, POST para " +
      "criar, PUT ou PATCH para alterar e DELETE para remover. As respostas usam os códigos de status de forma consistente e, " +
      "na maioria das vezes, trazem os dados em JSON, um formato de texto simples que qualquer linguagem entende. Uma ideia " +
      "central é não guardar estado da conversa no servidor: cada pedido traz tudo de que precisa, inclusive a prova de quem " +
      "está pedindo. Isso facilita espalhar o sistema por várias máquinas. REST não é a única opção. O GraphQL deixa o cliente " +
      "pedir exatamente os campos que quer, e o gRPC troca mensagens binárias, mais rápidas, entre serviços internos.",
  },
  {
    lang: "pt",
    id: "web-react",
    category: "Web",
    title: "Componentes com React",
    text:
      "O React é uma biblioteca para construir interfaces a partir de componentes: pequenas peças reutilizáveis, como um botão, " +
      "um cartão ou uma lista, que juntas formam a tela inteira. Cada componente é uma função que recebe dados, chamados props, " +
      "e descreve o que deve aparecer. Quando um componente precisa lembrar algo que muda, como o texto digitado num campo, ele " +
      "usa estado. A grande ideia do React é que você não manipula a tela diretamente: você descreve como ela deve ficar para " +
      "um certo estado, e a biblioteca descobre o que mudar quando o estado muda. Isso deixa o código mais previsível. Por cima " +
      "do React surgiram frameworks como o Next.js, que acrescentam rotas, renderização no servidor e outras peças necessárias " +
      "para um site completo. O próprio Pacto foi feito com Next.js.",
  },
  {
    lang: "pt",
    id: "ts-intro",
    category: "TypeScript",
    title: "O que é TypeScript",
    text:
      "TypeScript é JavaScript com tipos. Foi criado pela Microsoft e lançado em dois mil e doze, e todo código JavaScript " +
      "válido também é TypeScript válido. A diferença é que você pode dizer, por exemplo, que uma função recebe um número e " +
      "devolve um texto, e o compilador confere esse contrato em todo o projeto antes de o código rodar. Se alguém chamar a " +
      "função com o tipo errado, o erro aparece no editor, enquanto você digita, e não na mão do usuário. Os tipos existem " +
      "apenas na hora de escrever: o compilador os remove e gera JavaScript comum, que roda no navegador ou no Node.js. Por " +
      "isso, TypeScript não deixa o programa mais rápido nem mais lento. O ganho está na manutenção: renomear algo, mudar o " +
      "formato de um dado ou entender um código antigo fica muito mais seguro quando o editor sabe o tipo de cada coisa.",
  },
  {
    lang: "pt",
    id: "ts-tipos-basicos",
    category: "TypeScript",
    title: "Tipos básicos do TypeScript",
    text:
      "Os tipos mais simples do TypeScript são os mesmos valores do JavaScript: string para textos, number para números, " +
      "boolean para verdadeiro ou falso. Listas são descritas pelo tipo dos seus itens, como uma lista de números. Objetos são " +
      "descritos pelo formato, dizendo quais propriedades existem e o tipo de cada uma, e uma propriedade pode ser marcada como " +
      "opcional. Dois tipos especiais merecem atenção. O any desliga a verificação: aceita qualquer coisa e permite qualquer " +
      "operação, o que anula a vantagem de usar TypeScript. O unknown também aceita qualquer valor, mas obriga você a conferir " +
      "o que ele é antes de usar, e por isso é a escolha segura para dados que chegam de fora, como a resposta de uma API. " +
      "Existe ainda o never, o tipo de algo que nunca acontece, útil para garantir que todos os casos de uma escolha foram " +
      "tratados.",
  },
  {
    lang: "pt",
    id: "ts-interfaces",
    category: "TypeScript",
    title: "Interface ou type",
    text:
      "Em TypeScript, há duas formas principais de dar nome ao formato de um objeto: interface e type. Na maioria dos casos, as " +
      "duas fazem a mesma coisa e a escolha é questão de estilo do projeto. Algumas diferenças existem. Uma interface pode ser " +
      "declarada de novo em outro lugar, e as declarações se somam, o que é útil para estender tipos de bibliotecas. Uma " +
      "interface também pode estender outra de forma explícita, como uma herança de formatos. Já o type é mais geral: além de " +
      "objetos, pode nomear uniões, tuplas, tipos de funções e combinações de outros tipos. Um ponto importante é que a " +
      "verificação do TypeScript é estrutural: o que importa é o formato, não o nome. Se um objeto tem todas as propriedades " +
      "exigidas, ele é aceito, mesmo que tenha sido criado sem nenhuma relação com aquele tipo.",
  },
  {
    lang: "pt",
    id: "ts-unioes",
    category: "TypeScript",
    title: "Uniões e narrowing",
    text:
      "Uma união diz que um valor pode ser de um tipo ou de outro, como um identificador que pode ser número ou texto. Uniões " +
      "de valores literais são ainda mais úteis: o estado de um pedido pode ser apenas pendente, pago ou cancelado, e qualquer " +
      "outro texto vira erro de compilação. Para usar um valor de união, o código precisa descobrir qual dos tipos ele tem " +
      "naquele momento. O TypeScript acompanha essas verificações e estreita o tipo automaticamente, um processo chamado " +
      "narrowing. Depois de conferir que o valor é um texto, dentro daquele bloco o editor já oferece os métodos de texto. Um " +
      "padrão poderoso é a união discriminada: vários formatos de objeto que compartilham uma propriedade com valores " +
      "diferentes, como um campo tipo. Basta checar esse campo para o compilador saber exatamente quais outras propriedades " +
      "existem naquele caso.",
  },
  {
    lang: "pt",
    id: "ts-genericos",
    category: "TypeScript",
    title: "Genéricos",
    text:
      "Genéricos permitem escrever código que funciona com vários tipos sem perder a informação de qual tipo está sendo usado. " +
      "Pense numa função que devolve o primeiro item de uma lista. Sem genéricos, ela teria de aceitar qualquer coisa e " +
      "devolver qualquer coisa, e o tipo do resultado se perderia. Com um parâmetro de tipo, a função diz: recebo uma lista de " +
      "algum tipo e devolvo um item desse mesmo tipo. Quem chama não precisa informar nada, porque o TypeScript deduz o tipo a " +
      "partir do argumento. Genéricos também podem ter restrições, exigindo, por exemplo, que o tipo tenha uma propriedade " +
      "chamada id. As estruturas mais usadas do dia a dia são genéricas: listas, promessas, mapas e as respostas tipadas de " +
      "bibliotecas de requisição. Entender genéricos é o passo que separa quem só usa tipos de quem consegue criar bons tipos.",
  },
  {
    lang: "pt",
    id: "ts-strict",
    category: "TypeScript",
    title: "O modo estrito",
    text:
      "O TypeScript pode ser mais ou menos exigente, e a opção strict liga de uma vez um conjunto de verificações mais " +
      "rigorosas. A mais importante trata de valores nulos e indefinidos. Sem ela, qualquer variável pode silenciosamente ser " +
      "nula, e o erro clássico de acessar uma propriedade de algo inexistente só aparece com o programa rodando. Com o modo " +
      "estrito, o tipo precisa dizer explicitamente que um valor pode faltar, e o compilador obriga você a tratar esse caso " +
      "antes de usar. O modo estrito também reclama de parâmetros sem tipo, que viram any sem ninguém perceber, e confere " +
      "melhor os tipos de funções passadas como argumento. Em projetos novos, a recomendação é ligar o strict desde o primeiro " +
      "dia. Em projetos antigos, dá para ativar as verificações aos poucos, corrigindo uma parte do código de cada vez.",
  },
  {
    lang: "pt",
    id: "ts-inferencia",
    category: "TypeScript",
    title: "Inferência de tipos",
    text:
      "Ninguém precisa anotar o tipo de cada variável em TypeScript. O compilador observa o valor atribuído e deduz o tipo " +
      "sozinho, num processo chamado inferência. Se uma variável recebe um número, ela é um número; se uma função sempre " +
      "devolve um texto, o tipo de retorno é texto. A inferência também segue o caminho contrário: quando você passa uma função " +
      "como argumento, os parâmetros dela recebem o tipo esperado por quem chama. Na prática, a recomendação é anotar os " +
      "limites do código, como os parâmetros de funções exportadas e os dados que chegam de fora, e deixar a inferência cuidar " +
      "do resto. Anotar demais polui o código e pode até atrapalhar, porque um tipo escrito à mão às vezes é mais largo do que " +
      "o tipo que o compilador teria deduzido. Passar o mouse sobre uma variável no editor mostra o tipo inferido.",
  },
  {
    lang: "pt",
    id: "ts-literais",
    category: "TypeScript",
    title: "Tipos literais e enums",
    text:
      "Além de dizer que um valor é um texto, o TypeScript permite dizer exatamente qual texto. Um tipo literal aceita apenas " +
      "aquele valor, e uniões de literais criam conjuntos fechados de opções, como as direções norte, sul, leste e oeste. Para " +
      "quem vem de outras linguagens, a primeira ideia costuma ser o enum, que o TypeScript também tem. A diferença é que o " +
      "enum gera código JavaScript de verdade, um objeto que existe durante a execução, enquanto as uniões de literais " +
      "desaparecem na compilação e não pesam nada. Por isso, muitos projetos modernos preferem uniões de literais e reservam os " +
      "objetos constantes para quando precisam percorrer as opções. Com a expressão as const, um objeto ou uma lista ficam " +
      "congelados no tipo, e é possível derivar a união de valores diretamente deles, sem escrever as opções duas vezes.",
  },
  {
    lang: "pt",
    id: "ts-tsconfig",
    category: "TypeScript",
    title: "Compilando com tsconfig",
    text:
      "Um projeto TypeScript é configurado por um arquivo chamado tsconfig. Ele diz quais arquivos fazem parte do projeto, para " +
      "qual versão do JavaScript o código deve ser convertido, que tipo de módulos usar e quais verificações ligar. O " +
      "compilador oficial é o tsc, que confere os tipos e gera os arquivos JavaScript. Em muitos projetos atuais, porém, quem " +
      "converte o código são ferramentas mais rápidas, como esbuild, SWC ou o próprio empacotador do framework, que apenas " +
      "removem os tipos sem conferi-los. Nesse cenário, o tsc continua sendo usado, mas só para checar os tipos, normalmente " +
      "numa etapa de integração contínua. Outro ponto importante são os arquivos de declaração, que descrevem os tipos de " +
      "bibliotecas escritas em JavaScript puro. Muitos pacotes já trazem os seus, e os demais costumam ter declarações mantidas " +
      "pela comunidade.",
  },
  {
    lang: "pt",
    id: "ts-utilitarios",
    category: "TypeScript",
    title: "Tipos utilitários",
    text:
      "O TypeScript traz uma coleção de tipos prontos que transformam outros tipos. Partial torna todas as propriedades de um " +
      "objeto opcionais, o que é útil para funções de atualização que recebem só os campos alterados. Required faz o contrário. " +
      "Pick cria um tipo novo com apenas algumas propriedades escolhidas, e Omit cria um tipo sem as propriedades indicadas. " +
      "Readonly impede que as propriedades sejam alteradas. Record descreve um objeto usado como dicionário, com chaves de um " +
      "tipo e valores de outro. ReturnType extrai o tipo devolvido por uma função, o que evita repetir o mesmo formato em dois " +
      "lugares. A vantagem de usar esses utilitários é manter uma única fonte de verdade: quando o tipo original muda, todos os " +
      "derivados mudam junto, e o compilador aponta cada lugar do código que precisa ser ajustado.",
  },
  {
    lang: "pt",
    id: "java-jvm",
    category: "Java",
    title: "A JVM e o Java",
    text:
      "O Java foi lançado em mil novecentos e noventa e cinco com uma promessa: escreva uma vez, rode em qualquer lugar. Para " +
      "cumprir isso, o código Java não é compilado direto para o processador. O compilador gera um código intermediário, o " +
      "bytecode, que roda dentro da JVM, a máquina virtual do Java. Existe uma JVM para cada sistema, e o mesmo bytecode " +
      "funciona em todas. Durante a execução, a JVM observa quais trechos são mais usados e os compila para código de máquina, " +
      "uma técnica chamada compilação just in time, que deixa o Java muito rápido em programas que rodam por bastante tempo, " +
      "como servidores. Outras linguagens também rodam na JVM, como Kotlin e Scala, e conseguem usar as mesmas bibliotecas. Por " +
      "isso, aprender como a JVM funciona vale para todo esse ecossistema, que domina boa parte dos sistemas de bancos e " +
      "grandes empresas.",
  },
  {
    lang: "pt",
    id: "java-classes",
    category: "Java",
    title: "Classes e objetos em Java",
    text:
      "Em Java, quase todo código vive dentro de classes. Uma classe define atributos, que guardam o estado, e métodos, que " +
      "definem o comportamento. Cada objeto criado a partir da classe tem seus próprios valores de atributos. Os construtores " +
      "preparam o objeto no momento da criação. Os modificadores de acesso controlam quem pode ver cada parte: private esconde " +
      "dentro da própria classe, public libera para todo mundo, e protected libera para as subclasses. A prática comum é deixar " +
      "os atributos privados e oferecer métodos para ler ou alterar, o que permite validar os valores e mudar a implementação " +
      "sem quebrar quem usa a classe. Esse princípio se chama encapsulamento. Nas versões recentes, o Java ganhou os records, " +
      "classes enxutas para guardar dados imutáveis, que geram automaticamente construtor, comparação e representação em texto.",
  },
  {
    lang: "pt",
    id: "java-heranca",
    category: "Java",
    title: "Herança e interfaces",
    text:
      "Em Java, uma classe pode herdar de uma única outra classe, reaproveitando atributos e métodos e sobrescrevendo o que " +
      "precisa ser diferente. Para expressar capacidades que várias classes sem parentesco compartilham, existem as interfaces. " +
      "Uma interface declara métodos que uma classe se compromete a ter, como ser comparável ou poder ser fechada, e uma classe " +
      "pode implementar quantas interfaces quiser. Isso permite o polimorfismo: um método que recebe uma interface funciona com " +
      "qualquer objeto que a implemente, sem saber qual é a classe real. Classes abstratas ficam no meio do caminho, com parte " +
      "da implementação pronta e parte deixada para as subclasses. Com o tempo, a comunidade aprendeu que hierarquias de " +
      "herança muito profundas ficam rígidas, e a recomendação atual é preferir composição: montar objetos a partir de outros " +
      "objetos, usando interfaces para ligar as peças.",
  },
  {
    lang: "pt",
    id: "java-colecoes",
    category: "Java",
    title: "Coleções em Java",
    text:
      "O Java traz um conjunto de estruturas de dados prontas conhecido como Collections. As três famílias principais são as " +
      "listas, os conjuntos e os mapas. Uma List mantém os itens em ordem e aceita repetições; a implementação mais usada é a " +
      "ArrayList, baseada num vetor que cresce sozinho. Um Set não aceita itens repetidos, e o HashSet responde muito rápido se " +
      "um item já está lá. Um Map associa chaves a valores, e o HashMap é a escolha padrão para dicionários. Existem versões " +
      "ordenadas, como o TreeMap, que mantém as chaves em ordem. As coleções usam genéricos, então uma lista de textos só " +
      "aceita textos e o compilador reclama de qualquer outra coisa. Um detalhe importante: para que objetos próprios funcionem " +
      "bem em conjuntos e mapas, a classe precisa definir corretamente os métodos equals e hashCode, sempre os dois juntos.",
  },
  {
    lang: "pt",
    id: "java-excecoes",
    category: "Java",
    title: "Exceções em Java",
    text:
      "O Java trata erros com exceções, lançadas com throw e capturadas com try e catch. Uma particularidade da linguagem são " +
      "as exceções verificadas. Quando um método pode lançar uma delas, como um erro de leitura de arquivo, ele precisa " +
      "declarar isso na assinatura, e quem chama é obrigado a tratar ou repassar. A ideia era forçar o tratamento de falhas " +
      "previsíveis. Já as exceções não verificadas, como acessar um objeto nulo ou um índice fora da lista, indicam erros de " +
      "programação e não precisam ser declaradas. O famoso NullPointerException é a mais comum delas. Para recursos como " +
      "arquivos e conexões, o bloco try com recursos fecha tudo automaticamente ao final. Muitas bibliotecas modernas preferem " +
      "exceções não verificadas, porque as verificadas acabam espalhando declarações por todo o código e incentivam capturas " +
      "vazias, que escondem os problemas.",
  },
  {
    lang: "pt",
    id: "java-streams",
    category: "Java",
    title: "Streams e lambdas",
    text:
      "Desde o Java oito, a linguagem tem lambdas, funções curtas escritas no próprio lugar onde são usadas, e a API de " +
      "Streams, que permite processar coleções de forma declarativa. Em vez de escrever um laço com variáveis auxiliares, você " +
      "descreve uma sequência de etapas: filtrar os pedidos pagos, transformar cada um no seu valor, somar tudo. Cada etapa " +
      "recebe uma lambda dizendo o que fazer. As operações intermediárias, como filter e map, são preguiçosas: nada é executado " +
      "até uma operação final, como collect, count ou sum, pedir o resultado. Isso permite otimizações e até processamento em " +
      "paralelo com uma pequena mudança. O código fica mais curto e mais próximo da intenção. O cuidado é não exagerar: cadeias " +
      "muito longas ou com efeitos colaterais escondidos ficam difíceis de depurar, e às vezes um laço simples é mais claro.",
  },
  {
    lang: "pt",
    id: "java-memoria",
    category: "Java",
    title: "Memória e coletor de lixo",
    text:
      "Em Java, ninguém libera memória manualmente. Os objetos são criados numa área chamada heap, e um componente da JVM, o " +
      "coletor de lixo, encontra de tempos em tempos os objetos que nenhuma parte do programa consegue mais alcançar e devolve " +
      "esse espaço. Isso elimina uma classe inteira de erros comuns em linguagens como C, como usar memória já liberada. A " +
      "maioria dos objetos vive muito pouco, então a JVM divide o heap em gerações: os novos ficam numa área pequena, coletada " +
      "com frequência e rapidez, e os que sobrevivem são promovidos para uma área maior. Coletores modernos, como o G1 e o ZGC, " +
      "fazem boa parte do trabalho enquanto o programa roda e mantêm as pausas curtas. Mesmo assim, vazamentos de memória ainda " +
      "são possíveis: basta guardar referências a objetos que não serão mais usados, por exemplo numa lista que só cresce.",
  },
  {
    lang: "pt",
    id: "java-spring",
    category: "Java",
    title: "Spring Boot",
    text:
      "O Spring é o framework mais usado para construir sistemas em Java, principalmente APIs e aplicações de servidor. Sua " +
      "ideia central é a injeção de dependências: em vez de cada classe criar os objetos de que precisa, ela apenas declara o " +
      "que precisa, e o Spring cria, guarda e entrega as peças certas. Isso deixa as partes do sistema desacopladas e muito " +
      "mais fáceis de testar. O Spring Boot veio para simplificar a configuração. Com poucas anotações, ele sobe um servidor " +
      "web embutido, conecta ao banco de dados, expõe endpoints e aplica configurações padrão sensatas, que podem ser trocadas " +
      "quando necessário. Em volta dele há um ecossistema enorme: Spring Data para acessar bancos com pouquíssimo código, " +
      "Spring Security para autenticação e permissões, e ferramentas para monitorar a aplicação em produção. É por isso que ele " +
      "domina vagas de backend em Java.",
  },
  {
    lang: "pt",
    id: "java-build",
    category: "Java",
    title: "Maven e Gradle",
    text:
      "Projetos Java raramente são compilados à mão. Ferramentas de build, como Maven e Gradle, cuidam de baixar as " +
      "bibliotecas, compilar o código, rodar os testes e empacotar o resultado num arquivo pronto para executar. No Maven, o " +
      "projeto é descrito num arquivo XML que lista as dependências com seus nomes e versões, e a ferramenta busca tudo num " +
      "repositório central na internet. O Maven segue uma estrutura de pastas e um ciclo de etapas padronizados, então qualquer " +
      "pessoa entende rapidamente um projeto novo. O Gradle usa um script em vez de XML, o que dá mais flexibilidade, e costuma " +
      "ser mais rápido graças a cache e builds incrementais; é a ferramenta padrão em projetos Android. Os dois resolvem o " +
      "mesmo problema central: garantir que todas as máquinas, da sua até o servidor de integração contínua, construam " +
      "exatamente o mesmo programa.",
  },
  {
    lang: "pt",
    id: "java-tipos",
    category: "Java",
    title: "Tipos primitivos e objetos",
    text:
      "O Java separa os valores em dois mundos. Os tipos primitivos, como int, double e boolean, guardam o valor diretamente e " +
      "são muito leves. Todo o resto é objeto, acessado por meio de uma referência. Cada primitivo tem uma classe " +
      "correspondente, como Integer para int, porque as coleções só aceitam objetos. A conversão entre os dois acontece " +
      "sozinha, o que é cômodo, mas esconde armadilhas: comparar dois objetos Integer com o operador de igualdade compara as " +
      "referências, não os valores, e pode dar resultados diferentes conforme o número. Para objetos, a comparação de conteúdo " +
      "deve ser feita com o método equals. Outro ponto clássico é a String, que é imutável: todo método que parece alterar um " +
      "texto devolve, na verdade, um texto novo. Por isso, montar textos longos dentro de um laço deve ser feito com o " +
      "StringBuilder, evitando criar milhares de objetos temporários.",
  },
];
