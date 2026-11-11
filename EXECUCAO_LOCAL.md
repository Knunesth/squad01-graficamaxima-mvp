# Executar localmente no Windows

## Com Docker Desktop

1. Na raiz do projeto, copie `.env.example` para `.env` e substitua `POSTGRES_PASSWORD`.
2. Copie `Grafica-Maxima-Backend/.env.example` para `Grafica-Maxima-Backend/.env`. Use a mesma senha na `DATABASE_URL`, configure um `JWT_SECRET` aleatório com pelo menos 32 caracteres e defina senhas fortes para `ADMIN_PASSWORD` e `ATTENDANT_PASSWORD`.
3. Na raiz do projeto:

   ```powershell
   docker compose up -d postgres
   docker compose ps
   ```

4. Em um terminal:

   ```powershell
   Set-Location Grafica-Maxima-Backend
   npm ci
   npm run migrate
   npm run seed
   npm run dev
   ```

   Para testar que migrations são idempotentes, rode `npm run migrate` novamente; não deve aplicar migrations já registradas.

5. Em outro terminal:

   ```powershell
   Set-Location Grafica-Maxima-FrontEnd
   npm ci
   $env:VITE_API_URL = 'http://localhost:3301'
   npm run dev
   ```

   Acesse `http://localhost:5173`. O admin usa `ADMIN_LOGIN`/`ADMIN_PASSWORD` e o atendente usa `ATTENDANT_LOGIN`/`ATTENDANT_PASSWORD` definidos no arquivo `Grafica-Maxima-Backend/.env`.

## PostgreSQL instalado localmente

Instale PostgreSQL 16 ou superior e confirme que o serviço está ativo na porta 5432. Crie o usuário e o banco conforme `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` no `.env` raiz, ou ajuste `DATABASE_URL` no `.env` do backend para suas credenciais. Depois execute os passos 4 e 5 acima. As migrations criam o schema; o seed requer uma base vazia.

## Operação

- `npm run migrate` é seguro para repetir; migrations concluídas ficam registradas em `schema_migrations`.
- `npm run seed` é destinado à base vazia de desenvolvimento e exige senhas definidas no ambiente.
- `npm start` inicia o backend em produção e falha se `JWT_SECRET` ou `DATABASE_URL` não estiver definida.
- O E2E local, quando configurado, é executado por `node scripts/e2e-connection.js`; ele cria e remove registros `TESTE_`.
- A integração real com WhatsApp, os relatórios e o agendamento ainda não fazem parte desta fase. As variáveis correspondentes ficam documentadas para as fases seguintes.
