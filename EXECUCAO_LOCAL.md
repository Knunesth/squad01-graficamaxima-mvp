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
   Copy-Item .env.example .env -Force
   npm run dev
   ```

   Acesse `http://localhost:5173`. O admin usa `ADMIN_LOGIN`/`ADMIN_PASSWORD` e o atendente usa `ATTENDANT_LOGIN`/`ATTENDANT_PASSWORD` definidos no arquivo `Grafica-Maxima-Backend/.env`.

## PostgreSQL instalado localmente

Instale PostgreSQL 16 ou superior e confirme que o serviço está ativo na porta 5432. No PowerShell, conecte como administrador do PostgreSQL:

```powershell
psql -U postgres -h localhost -p 5432
```

No prompt `psql`, crie um usuário e uma base vazia (use a mesma senha em `DATABASE_URL` do `.env` do backend):

```sql
CREATE ROLE grafica LOGIN PASSWORD 'substitua-por-uma-senha-forte';
CREATE DATABASE graficamaxima OWNER grafica;
\q
```

Confirme que `DATABASE_URL` aponta para `postgresql://grafica:SENHA@localhost:5432/graficamaxima`. Se a senha tiver caracteres reservados de URL, aplique percent-encoding. Depois execute os passos 4 e 5 acima. As migrations criam o schema; o seed requer uma base sem usuários.

## Operação

- `npm run migrate` é seguro para repetir; migrations concluídas ficam registradas em `schema_migrations`.
- `npm run seed` é destinado à base vazia de desenvolvimento e exige senhas definidas no ambiente.
- `npm run build` no backend verifica a sintaxe JavaScript; no frontend, gera os arquivos Vite.
- `npm start` inicia o backend em produção e falha se `JWT_SECRET` ou `DATABASE_URL` não estiver definida.
- O E2E local é executado por `node scripts/e2e-connection.js` dentro da pasta do backend, com backend e frontend ativos; ele cria e remove registros `TESTE_` e testa relatórios e WhatsApp em modo mock.
- Os relatórios são exclusivos para admin. O agendamento gera e envia a semana anterior segunda às 8h e o mês anterior no dia 1 às 8h, conforme fuso/cron no `.env` do backend.
- Sem credenciais da Meta, o WhatsApp fica em modo mock. Para entrega real, configure as credenciais e o template aprovado no WhatsApp Manager; veja o README da raiz.
