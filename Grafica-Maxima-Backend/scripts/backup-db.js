#!/usr/bin/env node
require('dotenv').config({ quiet: true });
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function connectionOptions(rawUrl) {
  const url = new URL(rawUrl);
  const mode = (process.env.DATABASE_SSL || url.searchParams.get('sslmode') || 'disable').toLowerCase();
  const sslMode = ['disable', 'false', '0'].includes(mode) ? 'disable' : ['require', 'true', '1'].includes(mode) ? 'verify-full' : mode;
  if (!['disable', 'verify-ca', 'verify-full'].includes(sslMode)) throw new Error('DATABASE_SSL deve ser disable, require, verify-ca ou verify-full.');
  const args = ['--host', url.hostname, '--port', url.port || '5432', '--username', decodeURIComponent(url.username), '--dbname', decodeURIComponent(url.pathname.slice(1)), '--format=custom', '--compress=9', '--no-owner', '--no-acl'];
  return { args, password: decodeURIComponent(url.password), sslMode };
}

async function runBackup() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL precisa estar definida.');
  const { args, password, sslMode } = connectionOptions(process.env.DATABASE_URL);
  const directory = path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), 'private-backups'));
  await fs.mkdir(directory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.join(directory, `grafica-maxima-${timestamp}.dump`);
  args.push('--file', output);
  let caDirectory;
  try {
    const childEnv = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PGPASSWORD: password,
      PGSSLMODE: sslMode,
      PGAPPNAME: 'grafica-maxima-backup',
    };
    if (process.env.DATABASE_SSL_CA?.trim()) {
      caDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'grafica-backup-ca-'));
      const caFile = path.join(caDirectory, 'root.crt');
      await fs.writeFile(caFile, process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n'), { mode: 0o600 });
      childEnv.PGSSLROOTCERT = caFile;
    }
    await new Promise((resolve, reject) => {
      const child = spawn(process.env.PG_DUMP_PATH || 'pg_dump', args, { env: childEnv, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true });
      child.once('error', (error) => reject(error.code === 'ENOENT' ? new Error('pg_dump não foi encontrado. Instale os clientes do PostgreSQL e inclua pg_dump no PATH, ou defina PG_DUMP_PATH.') : new Error('Não foi possível iniciar pg_dump.')));
      child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`pg_dump terminou com código ${code}.`)));
    });
    const { size } = await fs.stat(output);
    console.log(JSON.stringify({ resultado: 'sucesso', arquivo: path.basename(output), bytes: size }));
  } catch (error) {
    await fs.rm(output, { force: true });
    throw error;
  } finally {
    if (caDirectory) await fs.rm(caDirectory, { recursive: true, force: true });
  }
}

if (require.main === module) runBackup().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { connectionOptions, runBackup };
