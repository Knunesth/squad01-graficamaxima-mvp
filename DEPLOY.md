# Implantação — Gráfica Máxima

## Estado

Este documento descreve a implantação preparada para o MVP. **O sistema ainda não está publicado.** Nenhum projeto, serviço, banco ou admin de produção foi criado. Consulte [BLOCKERS.md](BLOCKERS.md) antes de retomar.

Arquitetura escolhida:

- PostgreSQL gerenciado no Supabase, região São Paulo (`sa-east-1`), sujeito à conferência de projetos existentes na organização.
- API Node/Express no projeto Railway existente, como processo persistente e com uma instância.
- Frontend React/Vite no Netlify Free. O Vercel Hobby foi descartado para este sistema comercial porque seus termos limitam esse plano a uso pessoal e não comercial. O deploy Netlify aguarda token da conta.

## Configuração e segurança

Configure os valores somente no cofre de variáveis de cada serviço. Nunca coloque valores reais neste repositório.

**Railway — backend:**

- `DATABASE_URL`: conexão direta Supabase ou pooler compartilhado em modo sessão; não use o pooler de transação (`6543`), pois o app usa advisory locks. Em redes IPv4, o pooler de sessão usa a porta `5432`.
- `DATABASE_SSL=verify-full` e, quando necessário, `DATABASE_SSL_CA` com a CA do banco. A verificação TLS permanece habilitada.
- `JWT_SECRET` novo e aleatório; não reutilizar segredos antigos.
- `NODE_ENV=production`, `PORT` fornecida pela Railway, `TZ=America/Sao_Paulo`, `TRUST_PROXY=1`.
- `FRONTEND_URL` e `CORS_ORIGINS` com o domínio `netlify.app` do site, sem curingas.
- `REPORT_TIMEZONE`, `REPORT_WEEKLY_CRON`, `REPORT_MONTHLY_CRON`.
- `MAX_RECIPIENTS_ACTIVE`, `MAX_RECIPIENTS_TOTAL`, `LOGIN_RATE_LIMIT_WINDOW_MS`, `LOGIN_RATE_LIMIT_MAX`.
- `WHATSAPP_MODE=mock`; não configure credenciais da Meta nesta implantação.

`railway.json` executa `npm run migrate` como pre-deploy, inicia com `npm start` e verifica `/health`. O código usa `PORT`; a escala deve permanecer em uma única instância, pois o rate limiter ainda usa memória. O agendador coordena seus jobs com advisory lock no PostgreSQL.

O endpoint público `GET /health` verifica uma consulta ao PostgreSQL e se os jobs do agendador estão registrados. Retorna HTTP 200 com `status: ok` somente quando ambos estão ativos; em falha retorna HTTP 503 e `checks` indica `database` e `scheduler`. Configure um monitor externo (por exemplo, UptimeRobot, Better Stack ou serviço equivalente) para consultar a URL completa `/health` a cada 5 minutos, sem token, e alertar quando a resposta não for 200 ou não for JSON saudável. O endpoint não inclui conexão, credenciais, métricas de clientes nem dados de relatórios. Um healthcheck confirma disponibilidade, não substitui alarmes de erro e acompanhamento de backup.

Os logs do backend são linhas JSON com timestamp, evento, request ID, método, status, duração, código de erro e resultado do job. Não registram IP, caminho, cabeçalhos, corpo, nomes, e-mails, documentos ou telefones completos. O modo mock do WhatsApp inclui somente ID do envio, resultado e telefone mascarado. Encaminhe logs para o provedor da API com retenção restrita; não habilite logs de payload HTTP em produção.

**Netlify — frontend:**

- Build: `npm run build`; publicação: `dist/` (`netlify.toml`).
- Deixe `VITE_API_URL` sem valor em produção. O frontend usará URLs relativas para manter sessão first-party.
- Quando o domínio público Railway estiver disponível, adicione antes do fallback SPA uma regra de proxy `/api/*` para `https://<dominio-railway>/api/:splat`, com status `200`. Configure a origem Netlify correspondente em `FRONTEND_URL` e `CORS_ORIGINS`.
- A regra de API ainda não está configurada porque o domínio Railway ainda não existe. Até configurá-la, **não publique**: a regra SPA sozinha encaminharia chamadas de API para `index.html`.

**Bootstrap inicial:**

1. Confirme que `DATABASE_URL` aponta para a base Supabase de produção.
2. Defina temporariamente `BOOTSTRAP_ADMIN_LOGIN`, `BOOTSTRAP_ADMIN_PASSWORD` (mínimo 16 caracteres) e, opcionalmente, `BOOTSTRAP_ADMIN_NAME` no ambiente da CLI.
3. Com o projeto Railway vinculado, rode `railway run -- npm run bootstrap-admin` uma vez. O script usa hash scrypt, cria apenas o primeiro admin e é idempotente. Remova as variáveis temporárias do ambiente da CLI ao terminar.
4. Não execute `npm run seed` em produção. O script recusa `NODE_ENV=production` sem a exceção explícita de emergência.

## Fluxo de implantação

Depois de disponibilizar tokens na sessão de CLI (`SUPABASE_ACCESS_TOKEN`, `RAILWAY_API_TOKEN`, `NETLIFY_AUTH_TOKEN`), confirme a identidade de cada conta antes de qualquer alteração. Para Railway, `RAILWAY_API_TOKEN` é o token de escopo de conta/workspace; `RAILWAY_TOKEN` é o token restrito a um projeto. Confira as instruções atuais em [Supabase CLI](https://supabase.com/docs/reference/cli/introduction), [Railway CLI](https://docs.railway.com/cli) e [Netlify CLI](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/).

1. Liste as organizações e projetos Supabase. Reuse o projeto da aplicação se existir; senão crie somente um na organização existente, em `sa-east-1`. Gere senha Postgres aleatória de pelo menos 32 caracteres seguros para URL, configure-a via CLI/API do Supabase e mantenha-a somente no segredo Railway.
2. Copie do painel a URL direta ou do pooler de sessão. Rode `npm run migrate` no backend apontado para produção duas vezes. O runner próprio aplica as migrations SQL versionadas `001`–`008` e registra cada arquivo em `schema_migrations`.
3. Verifique no projeto Supabase: Data API desligada, exposição automática de tabelas desligada, RLS automático ligado. A migration `007` habilita RLS nas 19 tabelas da aplicação, sem policies permissivas; `schema_migrations` é interna e fica excluída. Confirme também que as tabelas futuras recebam RLS.
4. Configure as variáveis Railway descritas acima, confira uma réplica, vincule somente o projeto Railway existente sem usar `--new`, e faça upload direto da pasta `Grafica-Maxima-Backend` com `railway up`. `railway.json` roda migrations e healthcheck. Ative o domínio Railway padrão e registre a URL em `DEPLOY_LOG.md`, sem segredos.
5. Atualize `netlify.toml` com a regra proxy da API usando o domínio real Railway. Rode `npm ci`, `npm run lint`, `npm run build` e procure segredos no `dist/`. Vincule/crie o site Netlify e faça deploy da pasta `dist` com `netlify deploy --prod --dir=dist`. Não conecte repositório Git nem faça push.
6. Antes do upload, confira a lista de arquivos: Railway envia somente o contexto do backend filtrado por `.railwayignore`; Netlify publica somente `Grafica-Maxima-FrontEnd/dist`. Os PDFs locais em `docs/`, `.env`, dumps, logs e dependências locais não entram nesses pacotes.
7. Faça o smoke test no endereço Netlify: sessão/login/logout, CRUD de cliente e orçamento, status Finalizado, PDF, cálculo por m², materiais, dashboard, papéis, relatórios e WhatsApp mock. Crie e remova o atendente temporário e os demais registros de teste. Verifique CORS, cookies `Secure`/`HttpOnly`/`SameSite=Strict` e rate limit atrás do proxy.

Não conecte esses projetos ao Git para deploy. O histórico deste repositório não deve ser enviado a nenhum remoto nesta missão; use uploads diretos via CLI.

## Backup e restauração

- Supabase Pro inclui backup diário com retenção documentada de 7 dias; Free não inclui backup automático. No Free, faça backup lógico regular com Supabase CLI ou `pg_dump`, guarde-o criptografado em armazenamento seguro, separado do repositório, e teste restauração em projeto isolado antes de depender dele.
- A CLI Supabase atual pode exportar schema e dados separadamente com `supabase db dump --remote --file ...` e `supabase db dump --remote --data-only --file ...`. Esses arquivos contêm dados e nunca devem ser versionados. Não use `db reset` contra o projeto de produção.
- Em projeto pago, restaure um backup automático pela seção **Database → Backups** do painel. Para backup lógico, restaure primeiro em um banco isolado com `psql`, valide schema/dados e só depois programe a troca da URL do Railway; restauração pode causar indisponibilidade e substituir estado existente.
- Rotação da senha Postgres: atualize a senha no Supabase (Management API `PATCH /v1/projects/{ref}/database/password`, escopo `database_config_write`, ou painel), substitua `DATABASE_URL` no Railway e faça redeploy. Codifique caracteres reservados na URL.

## Rollback e rotação

- **Backend:** reverta para o deployment anterior no Railway. Migrations são aditivas neste MVP; avalie compatibilidade antes de reverter código após alteração de schema.
- **Frontend:** publique novamente o deploy anterior no Netlify; deixe o backend ativo durante a troca.
- **JWT:** gere um novo `JWT_SECRET`, atualize Railway e redeploy. Sessões existentes ficam inválidas e todos terão de entrar novamente.
- **Senha Postgres:** siga o procedimento de rotação acima. Confirme a conexão antes de remover a senha anterior, quando o provedor permitir sobreposição.
- **Domínios:** nenhum domínio personalizado ou DNS foi configurado; os domínios padrão dos provedores devem ser usados.

## Custos e limites verificados em 2026-11-11

- **Supabase Free:** US$ 0, 500 MB de banco; projeto pode pausar após uma semana inativo e não tem backup automático. **Supabase Pro:** a partir de US$ 25/mês, com backup diário/7 dias. Nenhum plano pago foi contratado. Consulte [preços](https://supabase.com/pricing) e [backups](https://supabase.com/docs/guides/platform/backups).
- **Railway:** conta está indicada como Trial, mas não foi possível confirmar saldo. A documentação pública descreve crédito de trial de US$ 5 por 30 dias; o custo depois depende do plano e do uso. Não foi feito upgrade nem cadastrado cartão. Consulte [preços e limites](https://docs.railway.com/pricing/plans).
- **Netlify Free:** US$ 0 com limite atual de 300 créditos mensais e limites rígidos; a documentação de migração informa que o plano gratuito aceita projetos comerciais. Personal é anunciado a US$ 9/mês e Pro a US$ 20/mês; nenhum plano pago foi contratado. Consulte [preços](https://www.netlify.com/pricing/) e [migração de Vercel](https://www.netlify.com/knowledge-base/migrate-to-netlify-from-vercel/).
- **Vercel Hobby:** US$ 0, mas não usado por restringir projetos a uso pessoal/não comercial. Vercel Pro começa em US$ 20/mês; nenhuma compra foi feita. Veja a [regra do Hobby](https://vercel.com/docs/plans/hobby).

Preços e limites mudam; confira as páginas oficiais antes de qualquer contratação. A implantação está parada antes de criar recursos porque faltam tokens de CLI e também falta um token Netlify para a alternativa gratuita.
