# Backup e restauração do PostgreSQL

O comando `npm run backup-db` lê `DATABASE_URL`, gera um arquivo custom comprimido com `pg_dump` em `BACKUP_DIR` (padrão `private-backups/`) e não grava a URL nem a senha no arquivo de backup ou na saída. O backup é dado sensível: mantenha-o fora do Git, com acesso restrito e criptografia no armazenamento de destino.

## Criar backup no Windows (PowerShell)

Instale os Command Line Tools do PostgreSQL. A versão do `pg_dump` deve ser igual ou mais nova que a versão do servidor. Confirme `pg_dump --version`, configure `DATABASE_URL` no ambiente da sessão e rode:

```powershell
$env:BACKUP_DIR = "D:\Backups\GraficaMaxima"
npm run backup-db
```

O resultado informa somente o nome do arquivo e o tamanho. `PG_DUMP_PATH` pode apontar para `pg_dump.exe` quando ele não estiver no `PATH`. `DATABASE_SSL` aceita `disable`, `require`, `verify-ca` ou `verify-full`; se necessário, `DATABASE_SSL_CA` recebe o certificado raiz PEM.

## Conferir e restaurar em banco isolado

Restaure sempre primeiro em um PostgreSQL temporário, com versão igual ou mais nova que a origem. Nunca use o banco de produção como destino de um teste. Configure `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` e `PGPASSFILE` na sessão; o arquivo indicado por `PGPASSFILE` deve ficar fora do repositório e ter acesso restrito.

```powershell
pg_restore --list "D:\Backups\GraficaMaxima\grafica-maxima-<data>.dump"
$env:PGDATABASE = "postgres"
createdb --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" grafica_restore_test
$env:PGDATABASE = "grafica_restore_test"
pg_restore --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" --no-owner --no-acl --dbname="$env:PGDATABASE" "D:\Backups\GraficaMaxima\grafica-maxima-<data>.dump"
psql --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" --dbname="$env:PGDATABASE" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
psql --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" --dbname="$env:PGDATABASE" -c "SELECT count(*) FROM schema_migrations;"
```

`grafica_restore_test` precisa ser um banco vazio. As credenciais de `PGPASSFILE` devem ser de um usuário local com permissão para criar esse banco; nunca use credenciais de produção neste ensaio. Compare a lista e a contagem de migrations com a origem, valide login e fluxos funcionais antes de considerar o backup recuperável. Ao terminar o ensaio, descarte somente o banco temporário:

```powershell
dropdb --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" grafica_restore_test
```

Para uma restauração real, faça uma janela de manutenção, use um destino isolado, confira o backup e planeje explicitamente a troca de conexão. `pg_restore` não deve ser executado sobre um banco com dados que precisem ser preservados.

## Ensaio isolado de schema

Foi validado com `pg_dump`/`pg_restore` 17 no PostgreSQL local: uma schema aleatória descartável recebeu uma tabela e um registro marcador, foi exportada em formato custom, removida, restaurada e consultada novamente; o valor marcador foi idêntico. O schema e os arquivos auxiliares temporários foram removidos após o ensaio. Para repetir em desenvolvimento, substitua `<schema_temporario>` por um identificador SQL válido, configure `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` e `PGPASSFILE` para o banco local e rode:

```powershell
pg_dump --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" --dbname="$env:PGDATABASE" --schema=<schema_temporario> --format=custom --no-owner --no-acl --file=restore-check.dump
psql --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" --dbname="$env:PGDATABASE" -c 'DROP SCHEMA <schema_temporario> CASCADE'
pg_restore --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" --no-owner --no-acl --dbname="$env:PGDATABASE" restore-check.dump
psql --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" --dbname="$env:PGDATABASE" -c 'SELECT * FROM <schema_temporario>.restore_marker'
```

Esse ensaio cobre a mecânica do archive e restauração de objetos da schema. O fluxo de recuperação completo de uma base continua sendo o procedimento de banco vazio acima.
