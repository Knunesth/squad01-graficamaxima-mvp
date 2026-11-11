# Gráfica Máxima — MVP

Aplicação para gerenciamento de clientes e orçamentos gráficos. O frontend usa React e Vite; a API usa Node.js e Express; o banco de desenvolvimento é PostgreSQL.

## Executar no Windows

Siga [`EXECUCAO_LOCAL.md`](EXECUCAO_LOCAL.md) para configurar o PostgreSQL, aplicar as migrations, popular os dados de demonstração e iniciar backend e frontend.

O schema oficial está em `Grafica-Maxima-Backend/database/migrations/`. Os scripts do backend são `npm run migrate` e `npm run seed`; configure `.env` a partir dos arquivos `.env.example` antes de executá-los.

## Pastas principais

- `Grafica-Maxima-Backend/`: API, migrations SQL e seed de desenvolvimento.
- `Grafica-Maxima-FrontEnd/`: aplicação React/Vite.
- `docs/legacy-mysql/`: dumps antigos preservados como referência histórica; não são usados pela aplicação.
