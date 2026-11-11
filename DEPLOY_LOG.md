# Registro de implantação

## 2026-11-11 01:01 -03:00 — Preflight e documentação

- Confirmada a branch `feat/mvp` e os oito commits de correção da auditoria.
- Frontend: `npm run lint` e `npm run build` passaram.
- Backend: `npm run build` passou; migrations executadas duas vezes no PostgreSQL local; E2E local passou.
- README atualizado para descrever as três novas tentativas, backoff de 1/4/15 segundos, tratamento de `Retry-After` em 429 e não repetição dos demais 4xx; removida a referência às rotas legadas.
- Não houve acesso a provedores nesta etapa. As variáveis de autenticação necessárias não estavam definidas no ambiente; os valores de credenciais não foram copiados nem exibidos.
- `npm audit` não pôde consultar o registry na primeira tentativa por restrição de rede. Após liberar acesso ao registry: frontend sem vulnerabilidades; backend com duas ocorrências moderadas em `minimatch` via `nodemon`, dependência apenas de desenvolvimento. A correção sugerida pelo npm exige uma versão fora da faixa declarada; nenhuma atualização incompatível foi aplicada.
