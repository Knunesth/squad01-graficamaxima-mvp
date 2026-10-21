# Executar localmente

1. Inicie o MySQL e configure `Grafica-Maxima-Backend/.env` com `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `PORT`, `FRONTEND_URL` e `JWT_SECRET`. Use `.env.example` como lista de variáveis; defina um segredo próprio para `JWT_SECRET`.
2. Configure `Grafica-Maxima-FrontEnd/.env` com `VITE_API_URL` apontando para a origem do backend. O exemplo usa a porta padrão 3301.
3. Em um terminal, dentro de `Grafica-Maxima-Backend`, execute `npm install` se necessário e `npm start` (ou `npm run dev`). Confira `GET /health`.
4. Em outro terminal, dentro de `Grafica-Maxima-FrontEnd`, execute `npm install` se necessário e `npm run dev`. A porta padrão é 5173. Entre com uma conta ativa do banco.

O navegador envia o cookie de sessão ao backend por CORS. Se a porta ou origem do frontend mudar, inclua a origem em `FRONTEND_URL` ou `CORS_ORIGINS` no backend e reinicie ambos os servidores após alterar `.env`.

Em um banco que já contém dados, não execute `npm run setup` nem `npm run seed`: esses comandos atualizam a conta administradora. Para preencher apenas preços de m² ausentes, use `npm run db:seed-prices`; preços já cadastrados são preservados.

Verificação: com os dois servidores ativos, execute `node scripts/e2e-connection.js` dentro do backend. O script cria registros `TESTE_`, testa login, CORS, consultas, cálculo e CRUD, e remove os registros ao terminar. No frontend, execute `npm run build` e `npm run lint`.
