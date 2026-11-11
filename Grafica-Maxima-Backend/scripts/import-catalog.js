#!/usr/bin/env node
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const db = require('../src/config/db');

const specs = {
  materiais: {
    table: 'material', key: ['categoria', 'nome'], fields: ['categoria', 'nome', 'custo_fixo', 'custo_unitario', 'lucro_fixo', 'lucro_unitario', 'ativo', 'origem', 'origem_id'], required: ['categoria', 'nome'], numeric: ['custo_fixo', 'custo_unitario', 'lucro_fixo', 'lucro_unitario', 'origem_id'], boolean: ['ativo'], defaults: { custo_fixo: '0', custo_unitario: '0', lucro_fixo: '0', lucro_unitario: '0', ativo: 'true' }, id: 'id_material',
  },
  papeis: {
    table: 'papel', key: ['nome', 'tipo'], fields: ['nome', 'tipo', 'largura_folha', 'altura_folha', 'custo_por_folha'], required: ['nome', 'tipo', 'largura_folha', 'altura_folha', 'custo_por_folha'], numeric: ['largura_folha', 'altura_folha', 'custo_por_folha'], id: 'id_papel',
  },
  impressoes: {
    table: 'impressao', key: ['tipo'], fields: ['tipo', 'custo_por_folha'], required: ['tipo', 'custo_por_folha'], numeric: ['custo_por_folha'], id: 'id_impressao',
  },
  acabamentos: {
    table: 'acabamento', key: ['nome', 'tipo'], fields: ['nome', 'tipo', 'descricao', 'custo', 'tipo_cobranca', 'custo_fixo', 'lucro_fixo', 'lucro_unitario'], required: ['nome', 'tipo'], numeric: ['custo', 'custo_fixo', 'lucro_fixo', 'lucro_unitario'], defaults: { custo: '0', custo_fixo: '0', lucro_fixo: '0', lucro_unitario: '0' }, id: 'id_acabamento',
  },
  cortes: {
    table: 'corte', key: ['tipo'], fields: ['tipo', 'descricao', 'valor_fixo', 'custo_unitario', 'lucro_fixo', 'lucro_unitario'], required: ['tipo'], numeric: ['valor_fixo', 'custo_unitario', 'lucro_fixo', 'lucro_unitario'], defaults: { valor_fixo: '0', custo_unitario: '0', lucro_fixo: '0', lucro_unitario: '0' }, id: 'id_corte',
  },
  'precos-m2': {
    table: 'preco_m2', key: ['tipo'], fields: ['tipo', 'preco_base_m2'], required: ['tipo', 'preco_base_m2'], numeric: ['preco_base_m2'], id: null,
  },
};

function parseCsv(source) {
  const text = source.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value); value = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else value += char;
  }
  if (quoted) throw new Error('CSV termina com campo entre aspas não fechado.');
  row.push(value);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  if (!rows.length) throw new Error('CSV vazio.');
  const headers = rows.shift().map((header) => header.trim());
  if (new Set(headers).size !== headers.length) throw new Error('Cabeçalhos duplicados.');
  const parsed = rows.map((cells, index) => ({ line: index + 2, data: Object.fromEntries(headers.map((header, column) => [header, (cells[column] ?? '').trim()])) }));
  parsed.headers = headers;
  return parsed;
}

function normalizeRow(spec, row) {
  const data = {};
  const errors = [];
  for (const field of spec.fields) {
    let value = row[field] ?? spec.defaults?.[field] ?? '';
    if (typeof value === 'string') value = value.trim();
    if (spec.required.includes(field) && !String(value).trim()) errors.push(`campo obrigatório: ${field}`);
    if (spec.numeric.includes(field) && value !== '') {
      const normalized = String(value).replace(',', '.');
      if (!/^-?\d+(\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) errors.push(`${field} deve ser numérico`);
      else value = normalized;
    }
    if (spec.boolean?.includes(field) && value !== '') {
      const bool = String(value).toLowerCase();
      if (!['true', 'false', '1', '0', 'sim', 'não', 'nao'].includes(bool)) errors.push(`${field} deve ser true/false`);
      else value = ['true', '1', 'sim'].includes(bool) ? 'true' : 'false';
    }
    data[field] = value === '' ? null : value;
  }
  return { data, errors };
}

function buildWhere(spec, data, start = 1) {
  return spec.key.map((field, offset) => `lower(coalesce(${field}::text, '')) = lower(coalesce($${start + offset}::text, ''))`).join(' AND ');
}

async function upsert(spec, data, dryRun) {
  const keyValues = spec.key.map((field) => data[field]);
  const { rows: existing } = await db.query(`SELECT ${spec.id || spec.key[0]} FROM ${spec.table} WHERE ${buildWhere(spec, data)} LIMIT 1`, keyValues);
  if (dryRun) return existing.length ? 'atualizaria' : 'inseriria';
  if (existing.length) {
    const updates = spec.fields.filter((field) => !spec.key.includes(field));
    if (updates.length) {
      await db.query(`UPDATE ${spec.table} SET ${updates.map((field, index) => `${field} = $${index + 1}`).join(', ')} WHERE ${buildWhere(spec, data, updates.length + 1)}`,
        [...updates.map((field) => data[field]), ...keyValues]);
    }
    return 'atualizado';
  }
  const placeholders = spec.fields.map((_, index) => `$${index + 1}`).join(', ');
  await db.query(`INSERT INTO ${spec.table} (${spec.fields.join(', ')}) VALUES (${placeholders})`, spec.fields.map((field) => data[field]));
  return 'inserido';
}

function parseArgs(args) {
  const result = { dryRun: false, file: null, type: null };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--dry-run') result.dryRun = true;
    else if (args[i] === '--file') result.file = args[++i];
    else if (args[i] === '--type') result.type = args[++i];
    else throw new Error(`Argumento desconhecido: ${args[i]}`);
  }
  if (result.file && !result.type) result.type = path.basename(result.file, path.extname(result.file));
  if (!result.file || !specs[result.type]) throw new Error('Uso: node scripts/import-catalog.js --type materiais --file caminho.csv [--dry-run]');
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const spec = specs[options.type];
  const file = path.resolve(options.file);
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const expectedHeaders = [...spec.fields, 'exemplo'];
  const missingHeaders = spec.fields.filter((field) => !rows.headers.includes(field));
  const extraHeaders = rows.headers.filter((field) => !expectedHeaders.includes(field));
  if (missingHeaders.length || extraHeaders.length) throw new Error(`Cabeçalhos inválidos. Faltando: ${missingHeaders.join(', ') || 'nenhum'}; extras: ${extraHeaders.join(', ') || 'nenhum'}.`);
  const failures = [];
  let inserted = 0, updated = 0, skipped = 0;
  for (const { line, data: raw } of rows) {
    if (/^(exemplo|example)$/i.test(raw.exemplo || '')) { skipped += 1; continue; }
    const { data, errors } = normalizeRow(spec, raw);
    if (errors.length) { failures.push({ line, errors }); continue; }
    try {
      const action = await upsert(spec, data, options.dryRun);
      if (action === 'inserido' || action === 'inseriria') inserted += 1;
      else updated += 1;
    } catch (error) { failures.push({ line, errors: [error.code ? `erro de banco (${error.code})` : 'erro ao gravar registro'] }); }
  }
  console.log(JSON.stringify({ tipo: options.type, modo: options.dryRun ? 'dry-run' : 'importacao', linhas: rows.length, inseridos: inserted, atualizados: updated, exemplosIgnorados: skipped, erros: failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
}

module.exports = { parseCsv, normalizeRow, specs, main };
