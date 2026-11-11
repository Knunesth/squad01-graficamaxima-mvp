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
