# Backend — Gráfica Máxima

API Node.js/Express conectada ao PostgreSQL pelo driver `pg`. O único sistema oficial de schema é SQL versionado em `database/migrations/`; o runner próprio aplica cada arquivo em ordem e registra versões em `schema_migrations`, com lock consultivo PostgreSQL. Essa opção evita uma ferramenta adicional de migrations e mantém operações específicas do schema legíveis em SQL.

## Configuração

Copie `.env.example` para `.env` e defina `DATABASE_URL`, `JWT_SECRET` (32 caracteres aleatórios ou mais), `ADMIN_PASSWORD` e `ATTENDANT_PASSWORD`. O backend não inicia sem `DATABASE_URL` e `JWT_SECRET`. `.env` é ignorado pelo Git. Em produção, configure `DATABASE_SSL=verify-full`; se a cadeia da autoridade certificadora não estiver no trust store do Node.js, forneça o certificado raiz em `DATABASE_SSL_CA`. Não use `rejectUnauthorized: false`.

O login e o cadastro usam `LOGIN_RATE_LIMIT_WINDOW_MS` e `LOGIN_RATE_LIMIT_MAX`. Em produção atrás de Railway/Render, configure `TRUST_PROXY=1` quando houver um único proxy confiável; para outras topologias, informe o número de saltos ou as redes confiáveis. Não use `true` sem controlar quem pode alcançar o servidor diretamente. O limitador usa armazenamento em memória por padrão; com mais de uma instância, conecte um store compartilhado Redis ou equivalente usando a opção `store` da fábrica `createLoginRateLimiter` em `src/middlewares/loginRateLimiter.js`.

## Banco limpo e execução

Na raiz do repositório:

```powershell
Copy-Item .env.example .env
Copy-Item Grafica-Maxima-Backend/.env.example Grafica-Maxima-Backend/.env
docker compose up -d postgres
Set-Location Grafica-Maxima-Backend
npm ci
npm run migrate
npm run seed
npm run dev
```

O seed é para uma base vazia e cria usuários admin/atendente, clientes, materiais, preços por m² e 36 orçamentos distribuídos por três meses. Para senhas, use os valores fortes configurados no `.env` do backend.

Para PostgreSQL instalado localmente, crie o banco e usuário conforme `DATABASE_URL` e siga os mesmos comandos de migration e seed. O guia PowerShell da raiz descreve os detalhes.

## Scripts

- `npm run dev`: backend com nodemon.
- `npm run build`: verifica a sintaxe de todos os arquivos JavaScript do backend.
- `npm start`: inicia em modo produção.
- `npm run migrate`: aplica migrations ainda pendentes; pode ser repetido.
- `npm run seed`: carrega dados demonstrativos na base vazia.
- `npm run bootstrap-admin`: cria o primeiro admin de forma idempotente a partir de `BOOTSTRAP_ADMIN_LOGIN` e `BOOTSTRAP_ADMIN_PASSWORD`. Use somente como comando pontual de implantação; defina as variáveis no ambiente da CLI e não use o seed em produção.

Os scripts `seed.js` e `scripts/seed-prices.js` recusam execução quando `NODE_ENV=production`. A exceção exige a variável explícita `ALLOW_SEED_IN_PRODUCTION=true`; use-a apenas em uma operação deliberada e controlada.

O frontend continua em `../Grafica-Maxima-FrontEnd`, com build e lint próprios. O agendamento backend usa `REPORT_WEEKLY_CRON`, `REPORT_MONTHLY_CRON` e `REPORT_TIMEZONE`; os padrões são segunda às 8h, dia 1 às 8h e `America/Sao_Paulo`. A geração agendada consulta sempre a semana ou o mês anterior.

## Relatórios (administradores)

Todas as rotas de relatórios exigem login e role `admin`; atendentes e clientes não têm acesso. As seis métricas são orçamentos criados, conversão (Aprovado + Finalizado), vendas Finalizadas, receita apenas de Finalizados, Aprovados/em produção em bloco separado e ticket médio. A comparação semanal/mensal usa o período imediatamente anterior. A receita usa `data_finalizacao`.

- `GET /api/reports?type=weekly|monthly&date=YYYY-MM-DD`: obtém ou gera o relatório para o período que contém a data.
- `POST /api/reports/generate` com `{ "type": "weekly|monthly", "date": "YYYY-MM-DD" }`: recalcula e persiste o período.
- `GET /api/reports/history?type=weekly|monthly&limit=12`: lista relatórios salvos.
- `GET /api/reports/:id`: carrega um relatório do histórico.

Relatórios são salvos em `relatorio` como snapshot de métricas e resumo em português. O envio pela WhatsApp Cloud API usa templates aprovados; sem token e phone number id, o provedor opera em mock. Os admins gerenciam destinatários e consultam os status no painel. As instruções para cadastrar o template da Meta estão no README da raiz.

O destinatário padrão é `WHATSAPP_DEFAULT_RECIPIENT`; outros números podem ser cadastrados na tela administrativa. Defina `WHATSAPP_MODE=cloud`, token, phone number id, versão e nome/idioma de um template aprovado para ativar envios reais. Sem as credenciais, o modo mock persiste o registro e escreve a mensagem no log. O agendador gera e envia relatórios aos destinatários ativos; evita repetir os que já foram registrados como enviados naquela semana/mês.
# Importação do catálogo

Use `npm run import-catalog -- --type <tipo> --file <arquivo.csv> [--dry-run]`. Tipos aceitos: `materiais`, `papeis`, `impressoes`, `acabamentos`, `cortes` e `precos-m2`. Modelos com os cabeçalhos esperados estão em `docs/modelos-catalogo/`. O importador valida cada linha, informa números de linha e usa as chaves naturais configuradas por tabela para atualizar registros em reimportações. Linhas com `exemplo=EXEMPLO` são ignoradas. Rode primeiro com `--dry-run`; o relatório de validação não grava dados.

## E2E da Fase 7

O ensaio cria uma schema aleatória, executa as migrations funcionais nela, testa o catálogo, troca/redefine senhas, invalidação de sessão, catch-up mock e healthcheck, e remove a schema no fim. Defina `PHASE7_TEST_DATABASE_URL` para um PostgreSQL local com permissão de criar schema e rode `npm run e2e:phase7`. O teste aceita somente `localhost`, `127.0.0.1` ou `::1`; não usa `DATABASE_URL` como fallback e recusa bancos remotos. A migration `007` não é aplicada pelo ensaio porque ela opera explicitamente nas tabelas do schema `public`.
