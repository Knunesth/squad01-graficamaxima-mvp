# Relatório do sistema — Gráfica Máxima (MVP)

> Data: 11/11/2026 · Base analisada: `main` em `fd3fe9a` (igual a `origin/main`) · Escopo: backend, frontend, banco, scripts, documentação e histórico git.
> Tudo o que está marcado como "verificado" foi executado nesta máquina. O que foi apenas lido no código está marcado como "leitura de código".

## Atualização — entregáveis de UX (mesmo dia, branch `feat/entregaveis-residencia`)

As seções abaixo descrevem a `main` antes desta rodada. Depois delas, foram aplicados os entregáveis da residência:

| Entregável | O que mudou |
|---|---|
| Resumo do orçamento embaixo | Materiais ocupam a largura toda; o resumo fica abaixo e uma barra fixa mostra subtotal, desconto, total e o botão de salvar. |
| Valores negativos e formatação | Quantidade, valor unitário e desconto usam um campo numérico no padrão brasileiro que não aceita sinal de menos. |
| Troca de cliente sem perder o orçamento | O cliente é trocado (ou cadastrado) em uma janela sobre a tela; os materiais permanecem. |
| Cliente escolhido em tabela | A etapa de cliente lista os cadastros em tabela com busca; some a busca por e-mail + CPF. |
| Filtro automático e status | A lista de orçamentos filtra ao digitar e ao clicar no status; o status é alterado na própria linha (inclusive "Finalizado") e a lista se atualiza. |
| Avisos de sucesso e erro | Toda ação de salvar, excluir ou mudar status termina com um aviso no canto da tela. |
| Ícones, espaçamento e formulários | Botões com ícone e espaço entre si; formulário de cliente refeito, com máscara de CPF/CNPJ e telefone; formulários sem caixa branca. |
| Configurações | Separada em Minha conta, Senha, Preços por m² e Administração. |
| Novo tipo de papel | Botão "Novo tipo de papel" e "Adicionar" por categoria; o administrador também pode criar uma categoria nova. |
| Valores do dashboard | Totais em reais dos novos e dos aprovados no mês, eixos e rótulos formatados e um resumo por status. |
| Pasta de testes | Backend em `Grafica-Maxima-Backend/tests/`; frontend em `Grafica-Maxima-FrontEnd/tests/`. |

Efeito sobre os achados da seção 7: **A3** (ação de finalizar) e **A15** (cores de status) estão resolvidos. **A1** está resolvido na tela, que agora envia o prazo no formato aceito e ganhou os campos de prazo e observações; a API continua devolvendo e aceitando formatos diferentes. **A2** (calculadora não vincula ao orçamento) e **A4** (500 sem corpo) continuam abertos.

Testes depois desta rodada: backend 190 (188 passam, 2 falhas esperadas) e frontend 84 (83 passam, 1 falha esperada). Lint e build do frontend passam.

## 1. Resumo

O sistema está em bom estado para um MVP. O backend é cuidadoso: consultas parametrizadas, transações com bloqueio de linha, controle de versão nos orçamentos, senhas com scrypt, sessão em cookie httpOnly e logs que não vazam dados pessoais. A atualização trouxe 34 commits que trocaram o MySQL por PostgreSQL e acrescentaram relatórios, envio por WhatsApp, backup e preparação de deploy.

O que mais pesa contra hoje:

1. **Quatro defeitos funcionais confirmados por teste** que afetam o uso diário: orçamento com prazo de entrega não pode ser editado, a calculadora de m² nunca grava o item no orçamento, não existe ação de "Finalizar" (os relatórios ficam sem receita) e requisições sem corpo derrubam a API com erro 500.
2. **Segredos antigos continuam no histórico do git**, e o `JWT_SECRET` do `.env` local ainda é igual a um deles.
3. **Não há CI.** Os testes criados agora só protegem o projeto se alguém rodar à mão.

Antes deste trabalho o projeto não tinha testes versionados além de um roteiro E2E. Agora tem **252 testes automatizados** (189 no backend, 63 no frontend), com 92,9% das linhas do backend cobertas. Quatro deles ficam marcados como falha esperada e documentam os defeitos acima.

**Nota de maturidade: 7/10** (a auditoria de 04/11 dava 5/10). Subiu pela migração bem feita, pela troca de senha, pelas migrations confiáveis e pela documentação de deploy. Não sobe mais por causa dos defeitos funcionais e da falta de CI.

## 2. O que foi feito nesta rodada

| Ação | Resultado |
|---|---|
| Atualizar o repositório | `main` local avançou 34 commits até `fd3fe9a` (fast-forward). O remoto `upstream` (`ilanmacedo/...`) respondeu "Repository not found" e ficou de fora. |
| Preservar o trabalho em andamento | A branch `fix/auditoria-rodada-1` (commit `d68b864`) continua intacta. As alterações não commitadas dela foram para o stash `stash@{0}`. Atenção: esse trabalho mexia nas migrations MySQL, que não existem mais na `main`. |
| Reinstalar dependências | As pastas `node_modules` locais eram da versão MySQL (sem `pg`). `npm ci` refeito no backend e no frontend. |
| Criar testes | Detalhes na seção 6. |
| Rodar as verificações | Detalhes na seção 5. |

Arquivos novos ou alterados (nada foi commitado):

- `Grafica-Maxima-Backend/tests/**` (16 arquivos) e quatro scripts novos em `Grafica-Maxima-Backend/package.json`.
- `Grafica-Maxima-FrontEnd/src/**/*.test.{js,jsx}` (5 arquivos), `tests/setup.js`, `tests/render.jsx`, `vitest.config.js`, dois scripts e seis dependências de desenvolvimento em `package.json` / `package-lock.json`.
- `README.md` (três linhas sobre os testes) e este relatório.

Nenhum arquivo de código da aplicação foi alterado.

## 3. Arquitetura

| Camada | Tecnologia | Pasta | Tamanho |
|---|---|---|---|
| Frontend | React 19, Vite 8, React Router 7, TanStack Query 5, React Hook Form + Zod, Tailwind 4 | `Grafica-Maxima-FrontEnd/` | ~4.000 linhas JS/JSX, ~4.600 de CSS |
| Backend | Node.js (CommonJS), Express 5, `pg`, `jsonwebtoken`, `pdfkit`, `node-cron`, `express-rate-limit` | `Grafica-Maxima-Backend/` | ~3.700 linhas |
| Banco | PostgreSQL 17, 8 migrations SQL versionadas | `Grafica-Maxima-Backend/database/migrations/` | 20 tabelas |
| Infra | Docker Compose (Postgres local), Railway (API), Netlify (site), Supabase (banco) — preparados, não publicados | raiz, `DEPLOY.md` | — |

**Fluxo.** O site chama a API com axios e cookie de sessão. Em produção o site e a API ficam na mesma origem (`/api` por proxy); em desenvolvimento a API fica em `localhost:3301`. O `src/app.js` aplica, nesta ordem: identificador de requisição e log, CORS, bloqueio de escrita vinda de origem desconhecida, leitura de JSON (limite de 100 kB), rotas públicas (`/`, `/health`, `/api/auth`), autenticação e as rotas protegidas.

**Autenticação.** Login gera um JWT HS256 de 8 horas em cookie `grafica_session` (httpOnly; `SameSite=Strict` e `Secure` em produção). Cada requisição confere no banco se a conta está ativa e se a versão do token ainda vale; trocar ou redefinir a senha invalida as sessões antigas. Há dois perfis: `admin` e `atendente`. O cadastro é público, mas cria a conta inativa até um administrador liberar.

**Rotas da API**

| Prefixo | O que faz | Quem pode |
|---|---|---|
| `/api/auth` | login, cadastro, logout, troca de senha, `/me`, gestão de usuários | público / logado / admin (usuários) |
| `/api/orcamentos` | criar, listar, consultar, editar, mudar status, gerar PDF, excluir | logado; excluir só admin |
| `/api/clientes` | CRUD e busca por e-mail + documento | logado |
| `/api/materiais` | catálogo de materiais | leitura: logado; escrita: admin |
| `/api/calculo` | tipos e cálculo por m² (simulação ou vínculo ao orçamento) | logado; alterar preço: admin |
| `/api/dashboard` | indicadores do mês e do funil | logado |
| `/api/reports` | relatórios semanal/mensal, destinatários e envios por WhatsApp | admin |

**Banco.** As tabelas em uso são `usuario`, `cliente`, `orcamento`, `item`, `material`, `preco_m2`, `historico_log`, `relatorio`, `relatorio_envio`, `whatsapp_destinatario` e `schema_migrations`. As tabelas `papel`, `impressao`, `acabamento`, `corte`, `servico`, `documento` e as de ligação (`acabamento_item`, `item_corte`, `servico_item`) vêm do modelo original e só são alimentadas pelo importador de catálogo; nenhuma tela as usa.

**Tarefas agendadas.** O backend gera e envia o relatório semanal (segunda, 08:00) e o mensal (dia 1, 08:00) no fuso de São Paulo. Ao iniciar, recupera execuções perdidas. Um bloqueio no banco impede envio duplicado quando há mais de uma instância.

## 4. Funcionalidades

| Módulo | Estado | Observação |
|---|---|---|
| Login, cadastro e sessão | Funciona | Coberto por teste de ponta a ponta na API. |
| Gestão de usuários (liberar, promover, redefinir senha) | Funciona | Só admin. |
| Clientes | Funciona | Sem endereço e sem paginação. |
| Catálogo de materiais | Funciona | Remoção lógica preserva orçamentos antigos. |
| Orçamentos: criar, listar, buscar, aprovar, PDF | Funciona | Total sempre recalculado no servidor. |
| Orçamentos: editar | **Com defeito** | Falha quando o orçamento tem prazo de entrega (achado A1). |
| Calculadora de m² | **Parcial** | Só simula; o vínculo ao orçamento não é alcançado pela tela (A2). |
| Dashboard | Funciona | Mês padrão calculado em UTC (A14). |
| Relatórios semanal e mensal | Funciona | Receita depende do status "Finalizado", que a tela não oferece (A3). |
| Envio por WhatsApp | Funciona em modo simulado | A integração real com a Meta nunca foi exercitada. |
| Importador de catálogo por CSV, backup, criação do admin | Funcionam | Linha de comando. |

## 5. Resultado das verificações

Todas executadas em 11/11/2026, com Node 24.15 e PostgreSQL 17 em contêiner descartável (removido ao final).

| Verificação | Resultado |
|---|---|
| Backend — testes unitários (`npm test`) | 110 passaram, 1 falha esperada (A4). Não precisa de banco; ~1,5 s. |
| Backend — suíte completa (`npm run test:all`) | 187 passaram, 2 falhas esperadas (A1, A4), 0 falhas. ~15 s. |
| Backend — cobertura | 92,9% das linhas, 89,5% dos desvios, 90,7% das funções. |
| Backend — sintaxe (`npm run build`) | Aprovado, 68 arquivos. |
| Backend — E2E existente (`npm run e2e:phase7`) | Aprovado. |
| Frontend — testes (`npm test`) | 61 passaram, 2 falhas esperadas (A2, A3). ~8 s. |
| Frontend — lint (`npm run lint`) | Aprovado, sem avisos. |
| Frontend — build (`npm run build`) | Aprovado. O arquivo principal tem 509 kB e o Vite avisa que passa de 500 kB. |
| `npm audit` — frontend | 0 vulnerabilidades. |
| `npm audit` — backend | 2 moderadas, só em ferramenta de desenvolvimento (`nodemon` → `minimatch`). Em produção (`--omit=dev`): 0. |

Não foi verificado: a aplicação rodando no navegador, o passo a passo de instalação do README, o envio real pelo WhatsApp, o backup com `pg_dump` e qualquer ambiente publicado.

## 6. Testes criados

### Backend — 189 testes (`Grafica-Maxima-Backend/tests/`)

Usam o executor de testes nativo do Node, sem dependência nova.

| Arquivo | Testes | O que cobre |
|---|---|---|
| `unit/validation.test.js` | 15 | Números, ids, textos, datas, status e arredondamento monetário. |
| `unit/quoteCalculation.test.js` | 12 | Total por item, subtotal, desconto percentual e em valor, limites de 1 a 17 itens. |
| `unit/metroQuadrado.test.js` | 7 | Área, custo, acréscimo e rejeição de tipos inválidos. |
| `unit/period.test.js` | 13 | Semana e mês do relatório, virada de ano, ano bissexto, fuso e horário de verão. |
| `unit/reportScheduler.test.js` | 9 | Quais relatórios recuperar conforme dia, hora e fuso. |
| `unit/seguranca.test.js` | 17 | Hash de senha, CORS, proxy, bloqueio de seed em produção, limite de tentativas de login, tratamento de erro e log sem dados pessoais. |
| `unit/whatsappProvider.test.js` | 9 | Máscara de telefone, modo simulado e chamada à API da Meta com rede falsa (sucesso, 429, 4xx, 5xx, queda de rede). |
| `unit/scripts.test.js` | 14 | Leitor de CSV, validação do catálogo, os seis modelos CSV versionados, opções do backup (senha fora dos argumentos) e geração do PDF. |
| `unit/app.test.js` | 15 | Cabeçalhos, CORS, bloqueio de origem, exigência de sessão em todas as rotas, tokens forjados, validação de entrada e comportamento com o banco fora do ar. |
| `integration/auth.test.js` | 16 | Login, cadastro, liberação, permissões, troca e redefinição de senha, queda de sessão. |
| `integration/cadastros.test.js` | 14 | Clientes (inclusive seis cadastros simultâneos do mesmo CPF) e catálogo. |
| `integration/orcamentos.test.js` | 24 | Criação, retrato de preço, listagem, busca, edição com controle de versão, duas edições simultâneas, status, PDF, exclusão e trilha de auditoria. |
| `integration/operacao.test.js` | 11 | Calculadora de m² com vínculo, limite de 17 itens, dashboard e o script de migrations (aplicação do zero e reexecução). |
| `integration/relatorios.test.js` | 13 | Métricas do relatório, comparação com o período anterior, destinatários, envio simulado, reenvio e limites. |

Os testes de integração sobem a API real contra um PostgreSQL real. Eles só rodam se `TEST_DATABASE_URL` estiver definida, recusam qualquer banco que não seja local e trabalham dentro de um schema aleatório, apagado ao final. Sem a variável, são pulados e a suíte continua verde.

### Frontend — 63 testes (`Grafica-Maxima-FrontEnd/src/**/*.test.*`)

Usam Vitest, Testing Library e jsdom (dependências de desenvolvimento novas).

| Arquivo | Testes | O que cobre |
|---|---|---|
| `shared/utils/utils.test.js` | 11 | Formatação de moeda, decimal e data; mensagens de erro; junção de classes. |
| `shared/services/api.test.js` | 6 | Configuração do axios e o aviso de sessão expirada. |
| `shared/components/ui/ui.test.jsx` | 13 | Botão, campo, feedback, tabela e etiqueta de status, incluindo atributos de acessibilidade. |
| `app/AppRoutes.test.jsx` | 8 | Quem enxerga cada rota: visitante, atendente e administrador. |
| `features/features.test.jsx` | 25 | Telas de login e cadastro, usuários, detalhe do orçamento e calculadora, com a API substituída por dublês. |

### Como rodar

```bash
# Backend, sem banco
cd Grafica-Maxima-Backend
npm test

# Backend, tudo (precisa de um PostgreSQL local)
docker compose up -d postgres            # na raiz, com o .env preenchido
TEST_DATABASE_URL=postgresql://grafica:SUA_SENHA@localhost:55432/graficamaxima npm run test:all
npm run test:coverage

# Frontend
cd Grafica-Maxima-FrontEnd
npm test
```

No PowerShell, defina a variável antes: `$env:TEST_DATABASE_URL = '...'`.

### Testes marcados como falha esperada

Quatro testes descrevem o comportamento correto e hoje falham de propósito, sem quebrar a suíte. Quando o defeito for corrigido, basta remover a marcação (`todo` no backend, `.fails` no frontend; o Vitest avisa sozinho quando um `.fails` passa a dar certo).

Outros cinco testes têm "(comportamento atual)" no nome. Eles passam, mas registram comportamentos que merecem confirmação (A7, A8, A9, A15).

## 7. Achados

Severidade: alta, média ou baixa. "Teste" indica onde o comportamento está registrado.

### Alta

| ID | Achado | Onde | Evidência |
|---|---|---|---|
| A1 | **Orçamento com prazo de entrega não pode ser editado.** A API devolve `prazo_entrega` como data-hora (`2026-12-15T03:00:00.000Z`), a tela reenvia esse valor sem tratar e a API só aceita `AAAA-MM-DD`: responde 422 "Data inválida.". Todos os 36 orçamentos do seed têm prazo, então a demonstração inteira é afetada. | `FrontEnd/src/features/budgets/pages/NewBudgetPage.jsx:397`; `Backend/src/utils/validation.js` (`data`) | Verificado. Teste `todo` em `integration/orcamentos.test.js`. |
| A2 | **A calculadora de m² nunca grava o item no orçamento.** Ela é renderizada fora das rotas, então não enxerga o número do orçamento aberto e sempre cai na simulação. O endpoint de vínculo funciona, mas é inalcançável pela tela. | `FrontEnd/src/app/App.jsx:46`; `features/calculator/CalculatorM2.jsx:7` | Verificado. Teste `.fails` em `features.test.jsx`; o endpoint é coberto em `integration/operacao.test.js`. |
| A3 | **Não existe ação de "Finalizar" orçamento.** A tela só alterna entre "Aprovado" e "Não aprovado". Os relatórios contam venda e receita apenas em "Finalizado", então sairão sempre zerados. | `FrontEnd/src/features/budgets/pages/BudgetStatusPage.jsx:27-33` | Verificado. Teste `.fails`. Já constava no `BLOCKERS.md`. |
| A4 | **Requisição de escrita sem corpo responde 500.** No Express 5 o `req.body` fica indefinido quando não há JSON, e os controllers leem `req.body.campo` direto. Afeta login, cadastro e as demais rotas de escrita. A correção é uma linha no `app.js`. | `Backend/src/app.js:35`; `controllers/AuthController.js:14` | Verificado. Teste `todo` em `unit/app.test.js`. |
| A5 | **Segredos no histórico do git.** O `.env` do backend aparece em quatro commits (`10d4699`, `ca50dde`, `c10dd31`, `d5ca0e5`). O `JWT_SECRET` do `.env` local ainda é igual a um deles. Quem tem acesso ao repositório pode forjar sessões de qualquer ambiente que use esse segredo. | histórico git | Verificado por comparação de hash, sem expor o valor. Não sei qual segredo um ambiente publicado usaria. |

### Média

| ID | Achado | Onde | Evidência |
|---|---|---|---|
| A6 | **Não há CI.** Nenhum fluxo roda lint, build ou testes em push ou pull request. | sem `.github/` | Verificado. |
| A7 | **O preço é decidido por quem chama a API.** O valor unitário de cada item é livre (aceita abaixo do custo) e a calculadora aceita `preco_por_m2` e `margem_lucro` no corpo. A tela sugere custo + lucro unitários e ignora os valores fixos do material. Pode ser intencional (negociação), mas não há trava. | `Backend/src/services/quoteCalculation.js`; `MetroQuadradoService.js:24`; `NewBudgetPage.jsx:377` | Verificado. Testes "(comportamento atual)". |
| A8 | **Editar um orçamento aprovado mantém a aprovação.** O PDF passa a sair com valores diferentes dos que foram aprovados. | `Backend/src/controllers/orcamentoController.js` (`persistir`) | Verificado. Teste "(comportamento atual)". |
| A9 | **Destinatário de WhatsApp desativado não volta nem libera vaga.** O número não pode ser recadastrado e continua contando no limite total. A mensagem de erro manda "remover registros inativos", mas não existe rota para isso. | `Backend/src/services/whatsapp/deliveryService.js` | Verificado. Teste "(comportamento atual)". |
| A10 | **Qualquer atendente exclui clientes**, enquanto excluir orçamento e mexer no catálogo exige administrador. Precisa de decisão de negócio. | `Backend/src/routes/clientesRoutes.js:101` | Verificado. |
| A11 | **CNPJ alfanumérico é recusado.** A validação descarta tudo que não é dígito e exige 11 ou 14 números. O novo formato de CNPJ com letras (previsto pela Receita Federal para julho de 2026) não passa. Também não há conferência dos dígitos verificadores de CPF e CNPJ. Vale confirmar a regra vigente antes de mexer. | `Backend/src/routes/clientesRoutes.js:7-18` | Leitura de código; a data da regra não foi conferida nesta rodada. |
| A12 | **PDF sem desconto, sem endereço e sem campos editáveis.** O PDF mostra "Subtotal" mas não o desconto; imprime endereço do cliente, que a API não recebe; e prazo de entrega e observações não têm campo na tela. | `Backend/src/services/orcamentoPdf.service.js:150`; `NewBudgetPage.jsx:397-398` | Leitura de código. |
| A13 | **Ambiente local desatualizado.** O `Grafica-Maxima-Backend/.env` ainda está no formato MySQL (sem `DATABASE_URL`); o backend não sobe até ele ser refeito a partir do `.env.example`. | `Grafica-Maxima-Backend/.env` | Verificado (só os nomes das variáveis foram lidos). |

### Baixa

| ID | Achado | Onde |
|---|---|---|
| A14 | Dashboard usa UTC para o mês padrão e o fuso do servidor para a semana; perto da meia-noite e da virada do mês os números mudam de lugar. O campo `semanas[].ativos` guarda soma de valores, não contagem. As telas mostram datas cortando o texto em UTC, então um orçamento criado depois das 21h aparece com a data do dia seguinte. | `Backend/src/controllers/DashBoardController.js:4,33`; `FrontEnd/src/shared/utils/format.js:11` |
| A15 | A etiqueta de status só colore "Aprovado" e "Em análise". "Não aprovado", "Finalizado", "Em negociação" e "Inativo" saem todos em cinza, porque o componente conhece rótulos que a API nunca envia. | `FrontEnd/src/shared/components/domain/StatusBadge.jsx` |
| A16 | Código morto no backend: `LogService.js`, `OrcamentoService.js` (com erro de digitação que quebraria se fosse chamado), quatro arquivos vazios, `dashboardRoutes.js` não montado, `precos.json`, `create-admin.js` e três atalhos (`setup.js`, `migrate.js`, `scripts/init-db.js`). | `Grafica-Maxima-Backend/` |
| A17 | Código morto no frontend: `src/modules/legacy/` (5 componentes e 4 CSS sem nenhum import), `utils/errorHandler.js` sem uso e o reexport temporário `services/format.js`. | `Grafica-Maxima-FrontEnd/src/` |
| A18 | Lista de orçamentos com 4 itens por página fixos e `keepPreviousData`, opção que o TanStack Query 5 ignora (a tabela pisca ao paginar). Lista de clientes sem paginação. | `FrontEnd/src/features/budgets/hooks/useBudgets.js:6,15` |
| A19 | Sair não invalida o token no servidor: um cookie copiado continua válido até expirar (8 h). A coluna `token_version` já permitiria encerrar. | `Backend/src/controllers/AuthController.js` (`logout`) |
| A20 | Limite de tentativas de login guardado em memória: zera a cada reinício e não é compartilhado entre instâncias. Sem cabeçalhos CSP e HSTS. | `Backend/src/middlewares/loginRateLimiter.js`; `src/app.js` |
| A21 | Na edição, o nome do item mantido é gravado como veio da requisição; na criação o servidor impõe o nome do catálogo. | `Backend/src/controllers/orcamentoController.js:84-100` |
| A22 | Repositório pesado: 165 capturas de tela em `qa-evidence/` (27 MB) e arquivos de `tmp/` versionados; o pacote git tem 89 MB. | raiz |
| A23 | Calculadora ainda usa `alert()`, emojis e cores fixas, fora do padrão visual do resto. | `FrontEnd/src/features/calculator/CalculatorM2.jsx` |
| A24 | A migration 007 liga a segurança por linha (RLS) em todas as tabelas sem criar políticas. Funciona enquanto a aplicação conectar como dona das tabelas; com outro usuário de banco, todas as consultas voltariam vazias. | `Backend/database/migrations/007_enable_rls.sql` |

## 8. O que está bem feito

- **Consultas e transações.** Tudo parametrizado. Edição, exclusão e mudança de status usam transação com bloqueio da linha. Dois testes simulam concorrência real (duas edições e seis cadastros simultâneos) e o sistema se comporta corretamente.
- **Sessão.** Cookie httpOnly, algoritmo fixo, conferência da conta a cada requisição e invalidação por versão do token. Tokens de outro segredo, expirados, com outro algoritmo ou sem assinatura são recusados.
- **Erros e logs.** O cliente nunca recebe detalhe interno; erros do banco viram mensagens em português. O log só aceita uma lista fechada de campos e mascara telefones.
- **Orçamentos.** O total é sempre recalculado no servidor, o preço do material é fotografado no momento da venda e cada operação entra na trilha de auditoria com autor.
- **Envio de relatórios.** Uma entrega por relatório e destinatário, reenvio só com confirmação, novas tentativas apenas para falhas passageiras.
- **Migrations.** Aplicação do zero e reexecução sem efeito, ambas testadas.
- **Acessibilidade.** Rótulos ligados aos campos, mensagens de erro anunciadas, link para pular ao conteúdo e foco no título ao trocar de página.

## 9. Pendências da auditoria de 04/11

A auditoria anterior (`AUDITORIA_PENDENCIAS.md`, não versionada) foi feita sobre a versão MySQL. Situação dos itens que consegui reconferir:

| Situação | Itens |
|---|---|
| **Resolvidos** | P02 senha de admin fixa no código · P03 troca e recuperação de senha · P05 migrations que falhavam em silêncio · P06 schema duplicado · P14 ausência de testes (esta rodada) · P16 e P17 rotas mortas inseguras · P19 `JWT_SECRET` não validado · P21 variáveis ausentes do `.env.example` |
| **Parcialmente resolvidos** | P04 instalação (README reescrito; passo a passo não executado por mim) · P15 deploy e backup documentados, CI ainda não · P18 limite de login agora respeita proxy, mas segue em memória · P30 e P31 calculadora ganhou rótulos acessíveis, mantém `alert()` e a etiqueta de status segue incompleta |
| **Continuam abertos** | P01 segredos no histórico (A5) · P07 calculadora (A2) · P08 preço livre (A7) · P09, P10 e P11 PDF e campos (A12) · P12 fluxo de status (A3) · P13 permissões de atendente (A10) · P20 cabeçalhos de segurança (A20) · P22 e P23 código morto (A16, A17) · P24 e P25 paginação (A18) · P28 arquivos temporários versionados (A22) · P33 `semanas[].ativos` (A14) |
| **Não reavaliados** | P26, P27, P29, P32, P34 e P35 a P45 (diferenças entre o escopo prometido nos PDFs e o que foi entregue). |

## 10. Próximos passos sugeridos

1. **Corrigir A1 e A4.** São correções de poucas linhas com teste pronto: normalizar `prazo_entrega` e garantir `req.body` como objeto.
2. **Decidir e implementar A2 e A3.** Mover a calculadora para dentro das rotas e criar a ação de finalizar. Sem A3 os relatórios não têm utilidade.
3. **Trocar o `JWT_SECRET` e a senha do banco** em todo ambiente que tenha usado os valores antigos, e decidir se o histórico será reescrito (A5).
4. **Ligar um CI** que rode `npm test`, lint e build a cada pull request (A6). Os testes de integração podem usar um serviço PostgreSQL do próprio CI.
5. **Levar ao cliente as decisões de negócio:** trava de preço (A7), edição de orçamento aprovado (A8), quem pode excluir clientes (A10).
6. **Limpeza:** remover código morto (A16, A17) e tirar `qa-evidence/` e `tmp/` do repositório (A22).

## 11. Limites desta análise

- A aplicação não foi aberta no navegador; a interface foi avaliada por leitura e por testes de componente.
- O banco usado foi um contêiner vazio. Nenhum dado real ou ambiente publicado foi acessado.
- A integração real com o WhatsApp, o backup com `pg_dump` e o deploy não foram exercitados.
- Os achados marcados como "leitura de código" não têm teste que os reproduza.
- O remoto `upstream` não respondeu; se houver trabalho só lá, ele não entrou.
- Para rodar os testes de integração iniciei o Docker Desktop, que ficou aberto. O contêiner de teste foi removido.
