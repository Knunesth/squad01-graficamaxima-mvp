const path = require('node:path');
const PDFDocument = require('pdfkit');

const LOGO = path.join(__dirname, '..', 'assets', 'logomarca-grafica-maxima.png');
const PAGINA = { largura: 595.28, altura: 841.89, margem: 42, limite: 754 };
const COR = {
  primaria: '#4541a2', escura: '#20234f', cyan: '#007da7', magenta: '#b5186c',
  texto: '#353950', secundaria: '#62677d', linha: '#d8dbea', fundo: '#f5f6fb', branco: '#ffffff',
};
const EMPRESA = {
  nome: 'Gráfica Máxima', cnpj: '27.336.716/0001-10',
  endereco: 'QNM 5, Conjunto P, Ceilândia Sul - Brasília, DF - CEP 72215-066',
  telefone: '(61) 3022-1010', email: 'graficamaximadf@gmail.com',
  site: 'graficamaximadf.imprimastore.com.br',
};
const moedaBR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numeroBR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const dataHoraBR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

function moeda(valor) {
  return moedaBR.format(Number(valor || 0)).replace(/\u00a0/g, ' ');
}

function dataCalendario(valor) {
  if (!valor) return 'A definir';
  const iso = valor instanceof Date ? valor.toISOString() : String(valor);
  const dia = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia.split('-').reverse().join('/') : 'A definir';
}

function dataHora(valor) {
  if (!valor) return 'A definir';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 'A definir' : dataHoraBR.format(data).replace(',', '');
}

function texto(doc, conteudo, x, y, largura, opcoes = {}) {
  doc.text(String(conteudo ?? ''), x, y, { width: largura, ...opcoes });
}

function rotulo(doc, valor, x, y, largura) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COR.secundaria);
  texto(doc, valor, x, y, largura);
}

function faixaSuperior(doc) {
  doc.rect(0, 0, PAGINA.largura, 6).fill(COR.primaria);
  doc.rect(0, 6, PAGINA.largura * 0.34, 3).fill(COR.cyan);
  doc.rect(PAGINA.largura * 0.34, 6, PAGINA.largura * 0.18, 3).fill(COR.magenta);
}

function cabecalho(doc, orcamento) {
  faixaSuperior(doc);
  doc.image(LOGO, PAGINA.margem, 25, { fit: [174, 95] });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COR.primaria);
  texto(doc, 'ORÇAMENTO', 365, 39, 188, { align: 'right' });
  doc.font('Helvetica-Bold').fontSize(27).fillColor(COR.escura);
  texto(doc, `#${orcamento.id_orcamento}`, 365, 53, 188, { align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(COR.secundaria);
  texto(doc, `Criado em ${dataHora(orcamento.data_criacao)}`, 305, 88, 248, { align: 'right' });

  doc.font('Helvetica').fontSize(8.5).fillColor(COR.texto);
  texto(doc, EMPRESA.telefone, 42, 129, 120);
  texto(doc, EMPRESA.email, 166, 129, 223);
  texto(doc, `CNPJ ${EMPRESA.cnpj}`, 390, 129, 163, { align: 'right' });
  doc.fillColor(COR.secundaria).fontSize(8);
  texto(doc, EMPRESA.endereco, 42, 147, 511);
  doc.moveTo(42, 174).lineTo(553, 174).strokeColor(COR.linha).lineWidth(1).stroke();
}

function cabecalhoContinuacao(doc, orcamento) {
  faixaSuperior(doc);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COR.escura);
  texto(doc, `${EMPRESA.nome}  ·  Orçamento #${orcamento.id_orcamento}`, 42, 38, 511);
  doc.moveTo(42, 67).lineTo(553, 67).strokeColor(COR.linha).stroke();
  return 85;
}

function clienteEMetadados(doc, orcamento) {
  const cliente = orcamento.cliente || {};
  const nome = cliente.nome || orcamento.nome_cliente || 'Cliente não informado';
  doc.font('Helvetica-Bold').fontSize(12);
  const alturaNome = doc.heightOfString(nome, { width: 240 });
  const endereco = cliente.endereco ? String(cliente.endereco) : '';
  const alturaCartao = Math.max(98, 58 + alturaNome + (endereco ? 27 : 0));
  const topo = 194;
  doc.roundedRect(42, topo, 511, alturaCartao, 8).fill(COR.fundo);
  rotulo(doc, 'CLIENTE', 56, topo + 14, 240);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COR.escura);
  texto(doc, nome, 56, topo + 30, 240);
  doc.font('Helvetica').fontSize(9).fillColor(COR.secundaria);
  if (cliente.cpf_cnpj) texto(doc, String(cliente.cpf_cnpj), 56, topo + 35 + alturaNome, 240);
  if (endereco) texto(doc, endereco, 56, topo + 55 + alturaNome, 240, { height: 24, ellipsis: true });

  rotulo(doc, 'CONTATO', 317, topo + 14, 220);
  doc.font('Helvetica').fontSize(9).fillColor(COR.texto);
  if (cliente.telefone) texto(doc, cliente.telefone, 317, topo + 32, 220);
  if (cliente.email) texto(doc, cliente.email, 317, topo + 51, 220);

  const metaY = topo + alturaCartao + 15;
  const metas = [
    ['Validade', dataCalendario(orcamento.data_validade)],
    ['Prazo de entrega', dataCalendario(orcamento.prazo_entrega)],
    ['Situação', orcamento.status || 'Não informado'],
  ];
  metas.forEach(([titulo, valor], indice) => {
    const x = 42 + indice * 174;
    doc.roundedRect(x, metaY, 163, 55, 7).lineWidth(1).strokeColor(COR.linha).stroke();
    rotulo(doc, titulo, x + 11, metaY + 9, 141);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COR.escura);
    texto(doc, valor, x + 11, metaY + 26, 141, { height: 20, ellipsis: true });
  });
  return metaY + 77;
}

function tituloSecao(doc, titulo, y) {
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COR.escura);
  texto(doc, titulo, 42, y, 511);
  return y + 24;
}

function cabecalhoTabela(doc, y) {
  doc.roundedRect(42, y, 511, 29, 5).fill(COR.escura);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COR.branco);
  texto(doc, 'Material ou serviço', 54, y + 9, 258);
  texto(doc, 'Qtd.', 314, y + 9, 38, { align: 'right' });
  texto(doc, 'Unitário', 363, y + 9, 89, { align: 'right' });
  texto(doc, 'Total', 463, y + 9, 78, { align: 'right' });
  return y + 29;
}

function paginaNova(doc, orcamento, tabela = false) {
  doc.addPage();
  const y = cabecalhoContinuacao(doc, orcamento);
  return tabela ? cabecalhoTabela(doc, y) : y;
}

function itensTabela(doc, orcamento, itens, y) {
  y = tituloSecao(doc, 'Itens do orçamento', y);
  y = cabecalhoTabela(doc, y);
  itens.forEach((item, indice) => {
    const nome = String(item.tipo_produto || item.produto || 'Serviço');
    doc.font('Helvetica-Bold').fontSize(9.5);
    const alturaNome = doc.heightOfString(nome, { width: 250 });
    const alturaLinha = Math.max(36, alturaNome + 17);
    if (y + alturaLinha > PAGINA.limite) y = paginaNova(doc, orcamento, true);
    if (indice % 2 === 1) doc.rect(42, y, 511, alturaLinha).fill(COR.fundo);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COR.escura);
    texto(doc, nome, 54, y + 9, 250);
    doc.font('Helvetica').fontSize(9).fillColor(COR.texto);
    texto(doc, numeroBR.format(Number(item.quantidade || 1)), 314, y + 10, 38, { align: 'right' });
    texto(doc, moeda(item.valor_unitario), 363, y + 10, 89, { align: 'right' });
    texto(doc, moeda(item.valor_total ?? Number(item.quantidade || 1) * Number(item.valor_unitario || 0)), 463, y + 10, 78, { align: 'right' });
    y += alturaLinha;
    doc.moveTo(42, y).lineTo(553, y).strokeColor(COR.linha).lineWidth(0.6).stroke();
  });
  return y;
}

function resumo(doc, orcamento, itens, y) {
  const somaItens = itens.reduce((soma, item) => soma + Number(item.valor_total ?? Number(item.quantidade || 1) * Number(item.valor_unitario || 0)), 0);
  const subtotal = Number(orcamento.subtotal ?? somaItens);
  const total = Number(orcamento.valor_total ?? subtotal);
  const desconto = Math.max(0, subtotal - total);
  if (y + 133 > PAGINA.limite) y = paginaNova(doc, orcamento);
  y += 20;
  doc.roundedRect(322, y, 231, 106, 8).fill(COR.fundo);
  doc.font('Helvetica').fontSize(9).fillColor(COR.texto);
  texto(doc, 'Subtotal', 336, y + 13, 100);
  texto(doc, moeda(subtotal), 444, y + 13, 95, { align: 'right' });
  const nomeDesconto = orcamento.desconto_tipo === 'percentual' && Number(orcamento.desconto_valor) > 0
    ? `Desconto (${numeroBR.format(Number(orcamento.desconto_valor))}%)` : 'Desconto';
  texto(doc, nomeDesconto, 336, y + 35, 110);
  texto(doc, `- ${moeda(desconto)}`, 444, y + 35, 95, { align: 'right' });
  doc.moveTo(336, y + 60).lineTo(539, y + 60).strokeColor(COR.linha).stroke();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COR.escura);
  texto(doc, 'Total', 336, y + 72, 100);
  texto(doc, moeda(total), 424, y + 72, 115, { align: 'right' });
  return y + 122;
}

function linhas(doc, conteudo, largura) {
  const resultado = [];
  String(conteudo).split(/\r?\n/).forEach((paragrafo) => {
    let linha = '';
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const proxima = linha ? `${linha} ${palavra}` : palavra;
      if (linha && doc.widthOfString(proxima) > largura) {
        resultado.push(linha);
        linha = palavra;
      } else linha = proxima;
    }
    resultado.push(linha);
  });
  return resultado;
}

function observacoes(doc, orcamento, y) {
  if (!orcamento.observacoes) return;
  if (y + 58 > PAGINA.limite) y = paginaNova(doc, orcamento);
  y = tituloSecao(doc, 'Observações', y + 6);
  doc.font('Helvetica').fontSize(9.5).fillColor(COR.texto);
  for (const linha of linhas(doc, orcamento.observacoes, 500)) {
    if (y + 15 > PAGINA.limite) {
      y = paginaNova(doc, orcamento);
      y = tituloSecao(doc, 'Observações (continuação)', y);
      doc.font('Helvetica').fontSize(9.5).fillColor(COR.texto);
    }
    texto(doc, linha, 48, y, 500);
    y += 15;
  }
}

function rodapes(doc) {
  const { start, count } = doc.bufferedPageRange();
  for (let indice = start; indice < start + count; indice++) {
    doc.switchToPage(indice);
    doc.moveTo(42, 784).lineTo(553, 784).strokeColor(COR.linha).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(COR.secundaria);
    texto(doc, EMPRESA.site, 42, 794, 360);
    texto(doc, `Página ${indice - start + 1} de ${count}`, 445, 794, 108, { align: 'right' });
  }
}

function renderOrcamentoPdf(orcamento, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true,
    info: { Title: `Orçamento ${orcamento.id_orcamento}`, Author: EMPRESA.nome } });
  doc.pipe(stream);
  const itens = Array.isArray(orcamento.itens) && orcamento.itens.length ? orcamento.itens : [{
    tipo_produto: orcamento.produto || 'Serviço', quantidade: orcamento.quantidade || 1,
    valor_unitario: orcamento.valor_unitario ?? orcamento.valor_total ?? 0,
    valor_total: orcamento.valor_total ?? 0,
  }];
  cabecalho(doc, orcamento);
  const fimItens = itensTabela(doc, orcamento, itens, clienteEMetadados(doc, orcamento));
  const fimResumo = resumo(doc, orcamento, itens, fimItens);
  observacoes(doc, orcamento, fimResumo);
  rodapes(doc);
  doc.end();
}

module.exports = { renderOrcamentoPdf };
