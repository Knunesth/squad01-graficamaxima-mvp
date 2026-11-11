# Gráfica Máxima — MVP

Aplicação para administrar clientes e orçamentos de uma gráfica, com geração de PDF, catálogo de materiais, cálculo por m², dashboard e relatórios semanais/mensais. O frontend usa React 19 e Vite 8; a API usa Node.js e Express 5; o banco oficial é PostgreSQL.

## Usuários e acesso

- **Admin:** administra usuários, acessa relatórios, gerencia os destinatários de WhatsApp e consulta/envia relatórios.
- **Atendente:** trabalha com clientes e orçamentos. Não acessa relatórios.
- Clientes finais não possuem login nem acesso ao sistema ou aos relatórios.

As senhas são armazenadas com scrypt. Cadastros públicos criam somente contas de atendente inativas; o admin precisa liberá-las.

## Pré-requisitos

- Node.js 22 ou superior e npm.
- Docker Desktop com Compose, ou PostgreSQL 16 ou superior instalado localmente.
- PowerShell no Windows (os comandos abaixo também podem ser adaptados para outros sistemas).

## Executar do zero no Windows

Na raiz do repositório:

```powershell
Copy-Item .env.example .env -Force
Copy-Item Grafica-Maxima-Backend/.env.example Grafica-Maxima-Backend/.env -Force
notepad .env
notepad Grafica-Maxima-Backend/.env
docker compose up -d postgres
```

No `.env` da raiz, defina a senha do PostgreSQL. No `.env` do backend, use essa mesma senha na `DATABASE_URL`; defina também um `JWT_SECRET` aleatório com pelo menos 32 caracteres e senhas fortes para admin e atendente. Depois:

```powershell
Set-Location Grafica-Maxima-Backend
npm ci
npm run migrate
npm run seed
npm run dev
```

Em outro terminal:

```powershell
Set-Location Grafica-Maxima-FrontEnd
npm ci
Copy-Item .env.example .env -Force
npm run dev
```

Acesse `http://localhost:5173`. O backend fica em `http://localhost:3301`. O seed cria usuários de demonstração, seis clientes, materiais, preços e 36 orçamentos de três meses. Use as credenciais configuradas no `.env` do backend.

O guia [`EXECUCAO_LOCAL.md`](EXECUCAO_LOCAL.md) explica a alternativa com PostgreSQL instalado localmente e os scripts de validação.

## Banco e migrations

O schema oficial está em `Grafica-Maxima-Backend/database/migrations/`, em SQL versionado, aplicado pelo runner próprio do projeto. Cada migration fica registrada em `schema_migrations`; rodar `npm run migrate` novamente é seguro. A decisão de usar um runner pequeno, sem framework adicional, mantém o schema explícito e dispensa dependência extra.

O seed exige base sem usuários. Não importamos dados do banco anterior. Os dumps históricos foram preservados em `docs/legacy-mysql/` e não são usados em runtime.

## Relatórios

Somente admins podem consultar relatórios. A tela fica em **Relatórios** na navegação. As métricas são orçamentos criados, conversão, vendas finalizadas, receita de finalizados, aprovados/em produção e ticket médio. `Aprovado` permanece separado da receita; apenas `Finalizado` conta como venda. Conversão é `(Aprovado + Finalizado) / orçamentos criados`.

O backend persiste snapshots por semana/mês, compara com o período anterior e gera resumo em português. O agendador usa `REPORT_TIMEZONE`, `REPORT_WEEKLY_CRON` e `REPORT_MONTHLY_CRON`; os padrões são America/Sao_Paulo, segunda às 8h para a semana anterior e dia 1 às 8h para o mês anterior.

## WhatsApp Cloud API

O envio usa a API oficial da Meta e mensagens modelo (`template`), sem automação por WhatsApp Web. Sem credenciais, o modo mock registra o envio no banco e escreve a mensagem no log; não envia uma mensagem real. A tela administrativa permite cadastrar/remover destinatários. O número padrão pode vir de `WHATSAPP_DEFAULT_RECIPIENT`.

Para ativar a entrega real:

1. Configure um app da Meta com WhatsApp Cloud API, número habilitado e token com permissão de envio.
2. Cadastre e aguarde aprovação de um template de mensagem no WhatsApp Manager.
3. Configure `WHATSAPP_MODE=cloud`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `WHATSAPP_TEMPLATE_NAME` e, se necessário, `WHATSAPP_TEMPLATE_LANGUAGE` no `.env` do backend.
4. Defina `WHATSAPP_DEFAULT_RECIPIENT` no formato E.164 (`+5561999999999`) ou cadastre destinatários na tela de Relatórios.

Texto sugerido para template, com idioma `pt_BR` e cinco variáveis de corpo:

```text
Olá! Segue seu {{1}} da Gráfica Máxima, referente a {{2}}. Vendas finalizadas: {{3}}. Receita: {{4}}. Conversão: {{5}}. Acesse o painel para consultar os detalhes.
```

As variáveis são: tipo semanal/mensal, intervalo de datas, quantidade de vendas finalizadas, receita e conversão. A mensagem usa template para envio iniciado pelo negócio fora da janela de atendimento. Veja o exemplo oficial de envio de template no [Meta WhatsApp Business Platform Postman](https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text).

Envios e falhas ficam registrados em `relatorio_envio`. Falhas transitórias de rede e respostas HTTP 5xx recebem até três novas tentativas, com espera progressiva de 1, 4 e 15 segundos. Em HTTP 429, o sistema respeita o cabeçalho `Retry-After`. Erros HTTP 4xx de validação, exceto 429, não são repetidos. O status `Enviado` significa que o provedor aceitou a requisição; confirmação de entrega via webhook não faz parte deste MVP.

## Desenvolvimento e validação

- Backend: `npm run dev`, `npm run build`, `npm start`, `npm run migrate`, `npm run seed`.
- Frontend: `npm run dev`, `npm run build`, `npm run lint`.
- E2E local: com banco, backend e frontend ativos, rode `node scripts/e2e-connection.js` na pasta do backend. O roteiro testa login, clientes, orçamento, status, PDF, cálculo por m², dashboard, relatórios, bloqueio de atendentes e envio mock.
- O backend não possui transpilação; `npm run build` verifica a sintaxe dos arquivos JavaScript.

## Fora do MVP

- Login e relatórios para clientes finais.
- Confirmação de entrega/resposta do WhatsApp por webhook.
- Integração de produção com credenciais e template Meta aprovados (requer configuração da conta da gráfica).
- Importação/migração dos antigos dados MySQL.
