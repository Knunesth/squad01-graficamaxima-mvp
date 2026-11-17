# Testes — Gráfica Máxima

Documento único sobre os testes do sistema. Substitui a seção 6 do [RELATORIO_SISTEMA.md](../RELATORIO_SISTEMA.md); o [RELATORIO_TESTES.md](../RELATORIO_TESTES.md) continua como registro histórico da Fase 7.

Atualizado em 17/11/2026.

## Resumo

| Camada | Ferramenta | Testes | Precisa de banco | Última execução |
|---|---|---|---|---|
| Backend — unitários | `node:test` (nativo do Node) | 112 | Não | 112 passaram, 0 falhas |
| Backend — integração | `node:test` | 80 | Sim (PostgreSQL local) | **Não reexecutados** após as últimas correções (Docker parado); 187 passaram na rodada anterior, antes das correções |
| Backend — ponta a ponta | `scripts/e2e-phase7.js` | 1 roteiro | Sim | Aprovado em 11/11/2026 |
| Frontend | Vitest, Testing Library, jsdom | 87 | Não | 87 passaram, 0 falhas |

Não há testes marcados como "falha esperada": os quatro defeitos que estavam documentados dessa forma foram corrigidos (escrita sem corpo respondia 500, datas devolvidas pela API eram recusadas na volta, calculadora não vinculava o item ao orçamento aberto).

## Como rodar

Backend, sem banco:

```bash
cd Grafica-Maxima-Backend
npm test
```

Backend, com banco (integração). Os testes só rodam se `TEST_DATABASE_URL` estiver definida, recusam qualquer banco que não seja local e trabalham dentro de um schema aleatório, apagado ao final:

```bash
docker compose up -d postgres
```

```bash
cd Grafica-Maxima-Backend
npm run test:all
```

No PowerShell, defina antes `$env:TEST_DATABASE_URL = 'postgresql://usuario:senha@localhost:55432/graficamaxima'`. Sem a variável, a integração é pulada e a suíte continua verde.

Outros comandos do backend: `npm run test:integration` (só integração), `npm run test:coverage` (cobertura), `npm run e2e:phase7` (roteiro da Fase 7).

Frontend:

```bash
cd Grafica-Maxima-FrontEnd
npm test
```

`npm run test:watch` roda em modo contínuo. Antes de publicar, rode também `npm run lint` e `npm run build`.

## Backend — unitários (112)

Pasta `Grafica-Maxima-Backend/tests/unit/`.

| Arquivo | Testes | O que cobre |
|---|---|---|
| `validation.test.js` | 16 | Números, ids, textos, datas (inclusive data-hora ISO), status e arredondamento monetário. |
| `quoteCalculation.test.js` | 12 | Total por item, subtotal, desconto percentual e em valor, limite de 1 a 17 itens, sem erro de ponto flutuante. |
| `metroQuadrado.test.js` | 7 | Área, custo, acréscimo e rejeição de tipos de serviço inválidos. |
| `period.test.js` | 13 | Semana e mês dos relatórios, virada de ano, ano bissexto, fuso e horário de verão. |
| `reportScheduler.test.js` | 9 | Quais relatórios recuperar conforme dia, hora e fuso. |
| `seguranca.test.js` | 17 | Hash scrypt, CORS, proxy, bloqueio de seed em produção, limite de tentativas de login, tratamento de erro e log sem dados pessoais. |
| `whatsappProvider.test.js` | 9 | Máscara de telefone, modo simulado e chamada à API da Meta com rede falsa (sucesso, 429, 4xx, 5xx, queda de rede). |
| `scripts.test.js` | 14 | Leitor de CSV, validação do catálogo, os seis modelos CSV versionados, opções do backup (senha fora dos argumentos) e geração do PDF. |
| `app.test.js` | 15 | Cabeçalhos de segurança, CORS, proteção contra escrita de outra origem, sessão exigida em todas as rotas, tokens forjados, validação de entrada, corpo ausente e comportamento com o banco fora do ar. |

## Backend — integração (80)

Pasta `Grafica-Maxima-Backend/tests/integration/`. Sobem a API real contra um PostgreSQL real.

| Arquivo | Testes | O que cobre |
|---|---|---|
| `auth.test.js` | 16 | Login por cookie e por e-mail, cadastro que nunca cria administrador, liberação de conta, permissões, troca e redefinição de senha, queda de sessão ao desativar ou trocar a senha, logout. |
| `cadastros.test.js` | 15 | Clientes (normalização, documento repetido, CNPJ, seis cadastros simultâneos do mesmo documento, exclusão) e catálogo de materiais (permissões, categorias novas, remoção lógica). |
| `orcamentos.test.js` | 24 | Criação com totais no servidor, retrato de preço, listagem paginada, busca e filtro por status, edição com controle de versão, duas edições simultâneas, aprovação e PDF, finalização, exclusão, trilha de auditoria e envio de volta das datas devolvidas pelo GET. |
| `operacao.test.js` | 12 | Calculadora de m² (simulação e vínculo), limite de 17 itens, preço por m² só para administrador, dashboard (funil, mês, validade próxima) e o script de migrations (do zero e reexecução). |
| `relatorios.test.js` | 13 | Métricas e comparação com o período anterior, histórico, destinatários, envio simulado, reenvio com confirmação, limites e telefone mascarado nos logs. |

Testes com "(comportamento atual)" no nome passam, mas registram um comportamento que merece confirmação do cliente: valor unitário abaixo do custo é aceito, editar orçamento aprovado mantém o status, e número de WhatsApp desativado ainda conta no limite total.

## Frontend (87)

Pasta `Grafica-Maxima-FrontEnd/tests/`. A API é substituída por dublês; o roteador e os provedores vêm de `tests/helpers/render.jsx`.

| Arquivo | Testes | O que cobre |
|---|---|---|
| `utils.test.js` | 15 | Moeda, decimal, datas, máscaras de CPF/CNPJ e telefone, mensagens de erro e junção de classes. |
| `api.test.js` | 6 | Cookies de sessão, tempo limite, aviso de sessão expirada e mensagens de erro de rede. |
| `ui.test.jsx` | 12 | Botão, campo, feedback, tabela e etiqueta de status, com atributos de acessibilidade. |
| `routes.test.jsx` | 8 | Quem enxerga cada rota: visitante, atendente e administrador, atalhos do menu e link de pular para o conteúdo. |
| `budgets.test.jsx` | 25 | Campo numérico sem negativos, lista com filtro automático e status na linha, detalhe (aprovar, finalizar, versão desatualizada, exclusão confirmada), cliente em tabela, montagem do orçamento (totais, troca de cliente sem perder materiais, salvar, editar), cadastro de clientes. |
| `pages.test.jsx` | 19 | Login e cadastro, usuários (liberar, perfil, redefinir senha), calculadora de m² (simular e vincular ao orçamento aberto). |
| `dashboard-period.test.jsx` | 2 | Seleção do mês do dashboard. |

## Ponta a ponta (Fase 7)

`npm run e2e:phase7`, com PostgreSQL local e schema temporário. Recusa conexões fora de loopback e cria e remove o schema. Cobre a importação dos seis modelos CSV (inclusive `--dry-run` e repetição sem duplicar), troca e reset de senha com queda das sessões antigas, recuperação dos relatórios atrasados sem duplicar envios, `/health` nos estados com e sem agendador e o logger sem dados pessoais. Detalhes em [RELATORIO_TESTES.md](../RELATORIO_TESTES.md).

## O que os testes não cobrem

- Envio real pelo WhatsApp: só o modo simulado e a chamada à API com rede falsa.
- Backup e restauração com `pg_dump` real contra produção; ver [RESTAURACAO.md](../Grafica-Maxima-Backend/docs/RESTAURACAO.md).
- A migration `007_enable_rls.sql` não roda no teste ponta a ponta, porque altera o schema `public`.
- Ambiente publicado (Railway, Vercel, Supabase): nenhum teste automatizado; a conferência é manual, pelo roteiro de [PUBLICAR.md](PUBLICAR.md).
- Navegador de verdade: os testes do frontend usam jsdom; não há testes de ponta a ponta no navegador.
- Desempenho e carga.
