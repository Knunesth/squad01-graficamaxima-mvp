# Relatório de testes — Fase 7

**Executado em 11/11/2026.** Todos os ensaios com banco usaram PostgreSQL local e uma schema temporária aleatória (`phase7_e2e_*` ou equivalente), removida ao final. Não foram acessados nem alterados dados de produção.

## Resultados

- **Frontend — lint:** aprovado (`npm run lint`).
- **Frontend — build:** aprovado (`npm run build`). O Vite ainda avisa que o bundle JavaScript principal tem 505,19 kB, acima do limite padrão de 500 kB.
- **Backend — sintaxe/build:** aprovado (`npm run build`), sintaxe verificada em 52 arquivos JavaScript. Não há script de lint configurado no backend.
- **E2E da Fase 7:** aprovado (`npm run e2e:phase7`). O teste recusa conexões fora de loopback e cria/remova schema própria.

## Cobertura do E2E

- Os seis modelos CSV foram lidos, os dois exemplos de cada modelo foram ignorados e `--dry-run` não gravou registros. Cada tipo aceitou duas linhas válidas; duas importações consecutivas deixaram exatamente dois registros por tabela, sem duplicação. Valores inválidos, categoria desconhecida, valores negativos e dimensões iguais a zero foram rejeitados na validação.
- A troca de senha exigiu senha atual; senha atual incorreta foi rejeitada. O reset de senha por atendente retornou 403; por admin passou. JWTs antigos falharam após troca e reset, e a nova senha permitiu novo login.
- O catch-up verificou os períodos semanal e mensal recentes e gerou dois envios mock. Ao iniciar o scheduler e executar catch-up novamente, continuaram existindo exatamente dois registros de envio.
- `/health` retornou 503 com banco acessível e scheduler inativo, 200 com ambos ativos e 503 após parar o scheduler. O logger estruturado descartou campos arbitrários com nome e telefone completo.
- A configuração do backup foi testada para confirmar que a senha de conexão não fica nos argumentos de `pg_dump`. A rotina real `pg_dump`/`pg_restore` v17 foi ensaiada à parte em schema descartável: exportar, remover, restaurar e consultar o registro marcador passou.

## Limitações da validação

- A rotina `npm run backup-db` não foi executada ponta a ponta pelo cliente instalado no Windows: ele é `pg_dump` 16, enquanto o servidor local é PostgreSQL 17. O script exige versão do cliente igual ou mais nova. O dump/restauração de schema foi validado com cliente 17 disponível no container PostgreSQL local. Em produção, instale/configure cliente compatível via `PATH` ou `PG_DUMP_PATH`.
- O E2E da Fase 7 não executa a migration `007_enable_rls.sql`: ela altera explicitamente tabelas do schema `public`, fora do schema isolado do teste. As migrations funcionais `001`–`006` e `008` são aplicadas na schema temporária.
- O caso de `/health` com banco indisponível não foi simulado; a consulta positiva e os dois estados do scheduler foram exercitados.
- Não foi gerado PDF do guia: o Markdown cobre os fluxos existentes e não havia requisito visual que tornasse a conversão segura sem revisão de paginação.
- Esta entrega não executa a QA da Fase 6 em produção. Não houve login em serviços externos nem alteração de dados reais.

## Observação operacional

A interface não oferece uma ação para marcar orçamento como `Finalizado`, embora os relatórios contem esse status como venda. A pendência está detalhada em [BLOCKERS.md](BLOCKERS.md) e no [guia de uso](docs/GUIA_DE_USO.md). Nenhum monitor externo foi cadastrado; as instruções para consultar `/health` estão em [DEPLOY.md](DEPLOY.md).
