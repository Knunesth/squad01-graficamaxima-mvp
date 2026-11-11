# Backend — Gráfica Máxima

API Node.js/Express conectada ao PostgreSQL pelo driver `pg`. O único sistema oficial de schema é SQL versionado em `database/migrations/`; o runner próprio aplica cada arquivo em ordem e registra versões em `schema_migrations`, com lock consultivo PostgreSQL. Essa opção evita uma ferramenta adicional de migrations e mantém operações específicas do schema legíveis em SQL.

## Configuração

Copie `.env.example` para `.env` e defina `DATABASE_URL`, `JWT_SECRET` (32 caracteres aleatórios ou mais), `ADMIN_PASSWORD` e `ATTENDANT_PASSWORD`. O backend não inicia sem `DATABASE_URL` e `JWT_SECRET`. `.env` é ignorado pelo Git.

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
- `npm start`: inicia em modo produção.
- `npm run migrate`: aplica migrations ainda pendentes; pode ser repetido.
- `npm run seed`: carrega dados demonstrativos na base vazia.

O frontend continua em `../Grafica-Maxima-FrontEnd`, com build e lint próprios. O agendamento backend usa `REPORT_WEEKLY_CRON`, `REPORT_MONTHLY_CRON` e `REPORT_TIMEZONE`; os padrões são segunda às 8h, dia 1 às 8h e `America/Sao_Paulo`. A geração agendada consulta sempre a semana ou o mês anterior.

## Relatórios (administradores)

Todas as rotas de relatórios exigem login e role `admin`; atendentes e clientes não têm acesso. As seis métricas são orçamentos criados, conversão (Aprovado + Finalizado), vendas Finalizadas, receita apenas de Finalizados, Aprovados/em produção em bloco separado e ticket médio. A comparação semanal/mensal usa o período imediatamente anterior. A receita usa `data_finalizacao`.

- `GET /api/reports?type=weekly|monthly&date=YYYY-MM-DD`: obtém ou gera o relatório para o período que contém a data.
- `POST /api/reports/generate` com `{ "type": "weekly|monthly", "date": "YYYY-MM-DD" }`: recalcula e persiste o período.
- `GET /api/reports/history?type=weekly|monthly&limit=12`: lista relatórios salvos.
- `GET /api/reports/:id`: carrega um relatório do histórico.

Relatórios são salvos em `relatorio` como snapshot de métricas e resumo em português. O WhatsApp e a interface administrativa serão adicionados nas próximas fases.
