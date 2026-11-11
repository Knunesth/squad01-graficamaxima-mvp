# Registro de implantação

## 2026-11-11 01:01 -03:00 — Preflight e documentação

- Confirmada a branch `feat/mvp` e os oito commits de correção da auditoria.
- Frontend: `npm run lint` e `npm run build` passaram.
- Backend: `npm run build` passou; migrations executadas duas vezes no PostgreSQL local; E2E local passou.
- README atualizado para descrever as três novas tentativas, backoff de 1/4/15 segundos, tratamento de `Retry-After` em 429 e não repetição dos demais 4xx; removida a referência às rotas legadas.
- Não houve acesso a provedores nesta etapa. As variáveis de autenticação necessárias não estavam definidas no ambiente; os valores de credenciais não foram copiados nem exibidos.
- `npm audit` não pôde consultar o registry na primeira tentativa por restrição de rede. Após liberar acesso ao registry: frontend sem vulnerabilidades; backend com duas ocorrências moderadas em `minimatch` via `nodemon`, dependência apenas de desenvolvimento. A correção sugerida pelo npm exige uma versão fora da faixa declarada; nenhuma atualização incompatível foi aplicada.
- Aplicado `npm audit fix` sem `--force` nos dois pacotes: frontend zerado; backend sem vulnerabilidades críticas/altas, mantendo apenas as duas ocorrências moderadas de desenvolvimento descritas em `BLOCKERS.md`.
- Validação após as atualizações: lint/build frontend passaram; build backend e E2E passaram. O Vite avisou que o chunk principal tem aproximadamente 503 kB após minificação.
- Não foi criado nem alterado recurso de produção; credenciais/CLIs indisponíveis. Ver `BLOCKERS.md` para ações necessárias.
- Criados `.railwayignore` no backend e `.vercelignore` no frontend para excluir envs, documentação/dumps, dependências locais, logs e artefatos; `.gitignore` agora ignora variantes `.env.*` mantendo `.env.example` versionável. `git check-ignore` confirmou os envs reais ignorados e os exemplos preservados. PDFs locais permanecem não rastreados e não serão incluídos nos contextos de deploy.
- Não houve upload; a revisão final da lista de arquivos será feita antes do deploy quando a CLI estiver autenticada.
- Preparação backend: Pool e runner de migration agora compartilham configuração TLS estrita; criada migration `007_enable_rls.sql`, script `bootstrap-admin.js` idempotente e `railway.json` com migrate pre-deploy, start e healthcheck.
- Validação local da migration em banco temporário limpo: 7 migrations aplicadas e segunda execução sem mudanças; 19 de 19 tabelas da aplicação com RLS habilitado, zero policies; bootstrap criou o admin e a segunda execução não duplicou.
- Preparação frontend: API usa origem relativa no build de produção e localhost em dev; criado fallback SPA. A regra proxy `/api/*` permanece pendente do domínio Railway.
- Decisão do host frontend: Vercel Hobby é não comercial conforme política oficial; para não contratar plano pago, escolhido Netlify Free como substituto autorizado. Netlify CLI/token ausentes.
- Acrescentados `DEPLOY.md` e detalhes dos bloqueios. Não foram criados recursos remotos nem enviados dados; veja `BLOCKERS.md`.
- Validação final do código preparado: build/lint frontend passaram, build de sintaxe backend passou em 48 arquivos; migrations rodaram duas vezes no banco local já aplicado e em um banco temporário limpo; bootstrap idempotente e E2E passaram.
- Ajuste de isolamento de arquivos: `.railwayignore` exclui SQL de dump/backup e preserva `database/migrations/*.sql`, necessários ao comando de release.
- Sem acesso REST anon do Supabase, healthcheck público ou fluxo browser em produção: não há projeto/URL de produção autenticado para esses testes.

## 2026-11-11 01:25 -03:00 — Validação final e encerramento

- API frontend: produção usa sempre URL relativa; `VITE_API_URL` só se aplica em desenvolvimento. Build verificado sem URL `localhost:3301` e sem prefixos de token conhecidos.
- Frontend: lint/build passaram. Backend: sintaxe verificada em 48 arquivos. E2E final passou, incluindo login/roles, orçamento/PDF, dashboard, relatórios, catch-up, idempotência e limites de destinatários.
- Migrations: 7 aplicadas em banco temporário limpo e segunda execução sem alterações; RLS ligado em 19 tabelas da aplicação, zero policies; bootstrap admin criado uma vez e repetido sem duplicar.
- Commits desta missão: `44fc167`, `1905d1d`, `f18971a`, `cccdc01`, `9e646df`, `d360ab3`; o ajuste same-origin desta seção será commitado separadamente.
- Nenhuma CLI/provedor autenticado; sem uploads, recursos remotos, migrations de produção, admin de produção ou dados fake em produção. PDFs preexistentes continuam não rastreados.

## 2026-11-11 — Fase 0C: design, responsividade e acessibilidade

- Preservadas a marca, Inter local e paleta existente; ampliados os tokens CSS para estados, escala de espaço/tipo, foco, sombras, raios e camadas.
- Menu móvel recolhível, reflow sem overflow de 320 a 1920 px, áreas roláveis acessíveis por teclado, semântica/títulos por rota, erros associados aos campos, tabela textual para gráfico e calculadora com `<dialog>` nativo.
- Ferramentas de QA são exclusivamente devDependencies: `@axe-core/playwright` 4.14.0 (MPL-2.0), `playwright` 1.65.0 (Apache-2.0) e `lighthouse` 13.6.0 (Apache-2.0). Foram adicionadas para cumprir axe/Chromium, automação de teclado/capturas e Lighthouse; nenhuma delas entra no bundle/runtime de produção.
- Comparação de QA em schema temporário e seed fictício: antes, 54 capturas, 2 telas com overflow; axe baseline 18 estados em 390 px, 18 violações (2 críticas, 16 sérias). Depois, 108 capturas, zero overflow, zero violações axe em 108 estados e sete fluxos de teclado aprovados.
- Lighthouse antes/depois (login/dashboard, celular/desktop): acessibilidade 98→100 em todas as telas; melhores práticas 96 sem alteração; desempenho 52→52 celular login, 53→53 celular dashboard, 44→44 desktop login e 44→43 desktop dashboard. FCP cerca de 0,64 s, CLS abaixo de 0,001; LCP reportado entre 73,5 e 74,1 s, anômalo em Vite dev e pendente de repetição em build/produção.
- Capturas, resumos, baseline axe e relatório detalhado em `qa-evidence/design/` e `RELATORIO_DESIGN_ACESSIBILIDADE.md`. Sem leitor de tela real, aparelho físico, Safari, zoom 200% ou teste em produção.
