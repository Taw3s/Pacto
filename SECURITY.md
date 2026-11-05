# Segurança

Encontrou uma falha de segurança no Pacto? **Não abra issue pública.** Use o relato privado do GitHub: aba **Security → Report a vulnerability** deste repositório. Se não estiver disponível, escreva para o e-mail de contato publicado em <https://www.pactus.dev.br/privacidade>.

Inclua o que conseguir: o que acontece, como reproduzir e o que um atacante obteria. Respondemos assim que possível; é um projeto pessoal, sem prazo garantido.

## O que interessa mais

- Ler ou alterar dados de outro grupo ou de outra pessoa (RLS, rotas em `src/app/api`, RPCs `security definer`).
- Contornar as regras do jogo pelo banco: provas fora do dia, votos repetidos, pagamento de dia não devido, cotas da IA ou da digitação.
- Acesso a fotos e anexos do Storage sem ser do grupo.
- Vazamento de segredos de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`).

## Fora do escopo

- A chave `anon` do Supabase e o DSN do Sentry são públicos por natureza.
- Ataques de negação de serviço e testes automatizados em massa contra a produção. Teste numa cópia própria (veja o README).
