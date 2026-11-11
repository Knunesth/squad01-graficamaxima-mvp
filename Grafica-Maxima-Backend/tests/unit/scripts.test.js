const { capturarErro } = require('../helpers/env');
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { parseCsv, normalizeRow, specs } = require('../../scripts/import-catalog');
const { connectionOptions } = require('../../scripts/backup-db');
const { renderOrcamentoPdf } = require('../../src/services/orcamentoPdf.service');
const categorias = require('../../src/config/catalogo');

describe('import-catalog.parseCsv', () => {
  it('lê cabeçalho, linhas e numera a partir da linha 2', () => {
    const linhas = parseCsv('tipo,preco_base_m2\nbanner,48\nlona,42\n');
    assert.deepEqual(linhas.headers, ['tipo', 'preco_base_m2']);
    assert.equal(linhas.length, 2);
    assert.deepEqual(linhas[0], { line: 2, data: { tipo: 'banner', preco_base_m2: '48' } });
    assert.equal(linhas[1].line, 3);
  });

  it('aceita BOM, CRLF, linhas em branco e campos entre aspas', () => {
    const linhas = parseCsv('﻿nome,descricao\r\n"Corte, especial","diz ""oi"""\r\n\r\n  Vinco  ,\r\n');
    assert.equal(linhas.length, 2);
    assert.deepEqual(linhas[0].data, { nome: 'Corte, especial', descricao: 'diz "oi"' });
    assert.deepEqual(linhas[1].data, { nome: 'Vinco', descricao: '' });
  });

  it('preenche colunas ausentes com string vazia', () => {
    assert.deepEqual(parseCsv('a,b,c\n1')[0].data, { a: '1', b: '', c: '' });
  });

  it('rejeita CSV vazio, aspas não fechadas e cabeçalhos duplicados', () => {
    assert.match(capturarErro(() => parseCsv('')).message, /CSV vazio/);
    assert.match(capturarErro(() => parseCsv('\n\n')).message, /CSV vazio/);
    assert.match(capturarErro(() => parseCsv('a,b\n"aberto,1')).message, /aspas não fechado/);
    assert.match(capturarErro(() => parseCsv('a,a\n1,2')).message, /duplicados/);
  });
});

describe('import-catalog.normalizeRow', () => {
  it('aplica padrões e normaliza decimal com vírgula e booleanos', () => {
    const { data, errors } = normalizeRow(specs.materiais, { categoria: 'Offset', nome: ' Offset 90g ', custo_fixo: '1,5', ativo: 'Sim' });
    assert.deepEqual(errors, []);
    assert.equal(data.nome, 'Offset 90g');
    assert.equal(data.custo_fixo, '1.5');
    assert.equal(data.custo_unitario, '0');
    assert.equal(data.ativo, 'true');
    assert.equal(data.origem, null);
  });

  it('aponta campos obrigatórios, categoria desconhecida e números inválidos', () => {
    const { errors } = normalizeRow(specs.materiais, { categoria: 'Papelão', nome: '', custo_fixo: 'dez', custo_unitario: '-1', origem_id: '1.5', ativo: 'talvez' });
    const texto = errors.join(' | ');
    assert.match(texto, /campo obrigatório: nome/);
    assert.match(texto, /categoria inválido/);
    assert.match(texto, /custo_fixo deve ser numérico/);
    assert.match(texto, /custo_unitario não pode ser negativo/);
    assert.match(texto, /origem_id deve ser inteiro/);
    assert.match(texto, /ativo deve ser true\/false/);
  });

  it('exige dimensões de papel maiores que zero', () => {
    const { errors } = normalizeRow(specs.papeis, { nome: 'Couchê', tipo: 'Brilho', largura_folha: '0', altura_folha: '96', custo_por_folha: '0.5' });
    assert.deepEqual(errors, ['largura_folha deve ser maior que zero']);
  });

  it('cobre os seis tipos de catálogo com os modelos CSV versionados', () => {
    assert.deepEqual(Object.keys(specs).sort(), ['acabamentos', 'cortes', 'impressoes', 'materiais', 'papeis', 'precos-m2']);
    for (const [tipo, spec] of Object.entries(specs)) {
      const arquivo = path.join(__dirname, '..', '..', 'docs', 'modelos-catalogo', `${tipo}.csv`);
      const linhas = parseCsv(fs.readFileSync(arquivo, 'utf8'));
      assert.deepEqual(linhas.headers, [...spec.fields, 'exemplo'], `cabeçalho de ${tipo}.csv`);
      assert.ok(linhas.length >= 1, `${tipo}.csv deve trazer exemplos`);
      for (const { line, data } of linhas) {
        assert.deepEqual(normalizeRow(spec, data).errors, [], `${tipo}.csv linha ${line}`);
      }
    }
  });

  it('usa as mesmas categorias de material que a API', () => {
    assert.equal(specs.materiais.allowed.categoria, categorias);
    assert.equal(new Set(categorias).size, categorias.length, 'categorias não podem se repetir');
  });
});

describe('backup-db.connectionOptions', () => {
  const original = process.env.DATABASE_SSL;
  after(() => { process.env.DATABASE_SSL = original; });

  it('nunca coloca a senha nos argumentos do pg_dump', () => {
    process.env.DATABASE_SSL = 'disable';
    const { args, password, sslMode } = connectionOptions('postgresql://usuario%40app:s3nh%40-secreta@db.local:6543/minha_base');
    assert.equal(password, 's3nh@-secreta');
    assert.ok(!args.join(' ').includes('s3nh'));
    assert.equal(sslMode, 'disable');
    const valor = (flag) => args[args.indexOf(flag) + 1];
    assert.equal(valor('--host'), 'db.local');
    assert.equal(valor('--port'), '6543');
    assert.equal(valor('--username'), 'usuario@app');
    assert.equal(valor('--dbname'), 'minha_base');
    assert.ok(args.includes('--format=custom') && args.includes('--no-owner') && args.includes('--no-acl'));
  });

  it('usa a porta padrão e endurece "require" para verify-full', () => {
    process.env.DATABASE_SSL = 'require';
    const { args, sslMode } = connectionOptions('postgresql://u:p@db.local/base');
    assert.equal(args[args.indexOf('--port') + 1], '5432');
    assert.equal(sslMode, 'verify-full');
  });

  it('lê sslmode da URL quando DATABASE_SSL não está definida e rejeita modo inválido', () => {
    delete process.env.DATABASE_SSL;
    assert.equal(connectionOptions('postgresql://u:p@db.local/base?sslmode=verify-ca').sslMode, 'verify-ca');
    process.env.DATABASE_SSL = 'prefer';
    assert.match(capturarErro(() => connectionOptions('postgresql://u:p@db.local/base')).message, /DATABASE_SSL/);
  });
});

describe('orcamentoPdf.renderOrcamentoPdf', () => {
  function gerar(orcamento) {
    return new Promise((resolve, reject) => {
      const stream = new PassThrough();
      const partes = [];
      stream.on('data', (parte) => partes.push(parte));
      stream.on('end', () => resolve(Buffer.concat(partes)));
      stream.on('error', reject);
      renderOrcamentoPdf(orcamento, stream);
    });
  }
  const orcamento = {
    id_orcamento: 42,
    data_criacao: new Date('2026-11-01T12:00:00Z'),
    data_validade: new Date('2026-11-30T12:00:00Z'),
    prazo_entrega: '2026-11-20',
    status: 'Aprovado',
    subtotal: '200.0000',
    desconto_tipo: 'percentual',
    desconto_valor: '10.0000',
    valor_total: '180.0000',
    observacoes: 'Entregar pela manhã.',
    cliente: { nome: 'Studio Ipê', cpf_cnpj: '11111111111', telefone: '61 99911-1001', email: 'contato@studioipe.example', endereco: null },
    itens: [{ tipo_produto: 'Cartões de visita', quantidade: 100, valor_unitario: '2.0000', valor_total: '200.0000' }],
  };

  it('gera um PDF válido para um orçamento completo', async () => {
    const pdf = await gerar(orcamento);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.match(pdf.subarray(-32).toString(), /%%EOF\s*$/);
    assert.ok(pdf.length > 1500, `PDF pequeno demais: ${pdf.length} bytes`);
  });

  it('não quebra sem cliente, sem datas e com 17 itens', async () => {
    const pdf = await gerar({
      ...orcamento,
      data_validade: null,
      prazo_entrega: null,
      observacoes: null,
      cliente: { nome: null, cpf_cnpj: null, telefone: null, email: null, endereco: null },
      itens: Array.from({ length: 17 }, (_, i) => ({ tipo_produto: `Item ${i + 1} ${'x'.repeat(80)}`, quantidade: i + 1, valor_unitario: '1.5', valor_total: String((i + 1) * 1.5) })),
    });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  });
});
