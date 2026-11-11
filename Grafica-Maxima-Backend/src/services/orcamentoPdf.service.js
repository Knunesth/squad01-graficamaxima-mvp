const PDFDocument = require("pdfkit");

const empresaPadrao = {
  nome: "GRAFICA MAXIMA",
  endereco: "QNM 5 Conjunto P Ceilandia Sul",
  cidade: "(Ceilandia) 72215-066 Brasilia DF",
  telefone: "6130221010",
  email: "graficamaximadf@gmail.com",
  site: "www.graficamaximadf.imprimastore.com.br",
  cnpj: "27.336.716/0001-10",
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const data = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatarMoeda(valor) {
  return moeda.format(Number(valor || 0));
}

function formatarData(valor) {
  if (!valor) return "- - -";
  return data.format(new Date(valor));
}

function formatarDataHora(valor) {
  if (!valor) return "- - -";
  return dataHora.format(new Date(valor)).replace(",", "");
}

function totalItem(item) {
  return Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
}

function texto(doc, conteudo, x, y, options = {}) {
  doc.text(String(conteudo || ""), x, y, options);
}

function faixa(doc, titulo, y) {
  doc.save();
  doc.rect(45, y, 505, 22).fill("#e9e9e9");
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(10);
  texto(doc, titulo, 45, y + 6, { width: 505, align: "center" });
  doc.restore();
}

function logoTexto(doc, x, y) {
  const cores = ["#23a8e0", "#f04b4b", "#f5ca2f", "#36b869", "#7d5fff"];

  doc.save();
  cores.forEach((cor, index) => {
    doc.circle(x + 14 + index * 5, y + 18 - Math.sin(index) * 5, 5).fill(cor);
  });

  doc
    .fillColor("#444444")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("GRAFICA", x + 55, y + 7);
  doc.fontSize(15).text("MAXIMA", x + 55, y + 20);
  doc
    .font("Helvetica")
    .fontSize(6)
    .text("Nossa impressao e o que fica.", x + 56, y + 38);
  doc.restore();
}

function garantirEspaco(doc, y, alturaNecessaria) {
  if (y + alturaNecessaria <= 755) {
    return y;
  }

  doc.addPage();
  return 45;
}

function desenharTabelaItens(doc, itens, startY) {
  let y = startY;
  const produtoX = 50;
  const qtdX = 340;
  const unitarioX = 405;
  const totalX = 485;
  const larguraProduto = 275;

  doc.rect(45, y, 505, 22).fill("#e9e9e9");
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(10);
  texto(doc, "PRODUTO", produtoX, y + 6, { width: larguraProduto });
  texto(doc, "QTD", qtdX, y + 6, { width: 45, align: "right" });
  texto(doc, "UNITARIO", unitarioX, y + 6, { width: 65, align: "right" });
  texto(doc, "VALOR", totalX, y + 6, { width: 60, align: "right" });
  y += 22;

  itens.forEach((item) => {
    const produto =
      item.tipo_produto || item.produto || item.observacoes || "Impressao";

    doc.font("Helvetica-Bold").fontSize(10);
    const alturaTexto = doc.heightOfString(produto, { width: larguraProduto });
    const alturaLinha = Math.max(36, alturaTexto + 18);
    y = garantirEspaco(doc, y, alturaLinha + 18);

    doc.fillColor("#111111").font("Helvetica-Bold").fontSize(10);
    texto(doc, produto, produtoX, y + 8, { width: larguraProduto });

    doc.font("Helvetica").fontSize(10);
    texto(doc, item.quantidade || 1, qtdX, y + 10, {
      width: 45,
      align: "right",
    });
    texto(doc, formatarMoeda(item.valor_unitario), unitarioX, y + 10, {
      width: 65,
      align: "right",
    });
    texto(
      doc,
      formatarMoeda(item.valor_total || totalItem(item)),
      totalX,
      y + 10,
      {
        width: 60,
        align: "right",
      },
    );

    y += alturaLinha;
    doc.moveTo(45, y).lineTo(550, y).strokeColor("#d5d5d5").stroke();
  });

  return y;
}

function desenharTotais(doc, valorTotal, startY) {
  const y = garantirEspaco(doc, startY, 80);

  doc.fillColor("#111111").font("Helvetica").fontSize(10);
  texto(doc, "Subtotal", 390, y + 12, { width: 75, align: "right" });
  texto(doc, formatarMoeda(valorTotal), 475, y + 12, {
    width: 75,
    align: "right",
  });

  doc.rect(350, y + 34, 200, 28).fill("#e9e9e9");
  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(12);
  texto(doc, "TOTAL", 365, y + 42, { width: 70 });
  texto(doc, formatarMoeda(valorTotal), 455, y + 42, {
    width: 85,
    align: "right",
  });

  return y + 78;
}

function rodape(doc) {
  const bottom = 760;

  doc
    .moveTo(45, bottom - 8)
    .lineTo(550, bottom - 8)
    .strokeColor("#d5d5d5")
    .stroke();
  doc.fillColor("#555555").font("Helvetica").fontSize(8);
  texto(
    doc,
    "Documento gerado automaticamente a partir das informacoes do orcamento.",
    45,
    bottom,
    { width: 505, align: "center" },
  );
}

function renderOrcamentoPdf(orcamento, stream) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 45,
    info: {
      Title: `Orcamento ${orcamento.id_orcamento}`,
      Author: empresaPadrao.nome,
    },
  });

  doc.pipe(stream);

  const cliente = orcamento.cliente || {};
  const itens =
    Array.isArray(orcamento.itens) && orcamento.itens.length > 0
      ? orcamento.itens
      : [
          {
            tipo_produto:
              orcamento.produto || orcamento.observacoes || "Impressao",
            quantidade: orcamento.quantidade || 1,
            valor_unitario:
              orcamento.valor_unitario || orcamento.valor_total || 0,
            valor_total: orcamento.valor_total || 0,
          },
        ];
  const valorTotal = Number(
    orcamento.valor_total ||
      itens.reduce((acc, item) => acc + totalItem(item), 0),
  );

  doc.fillColor("#111111").font("Helvetica").fontSize(8);
  texto(doc, formatarDataHora(new Date()), 45, 45, { width: 160 });
  texto(doc, "Pagina de impressao", 45, 45, { width: 505, align: "center" });

  logoTexto(doc, 75, 82);

  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(10);
  texto(doc, empresaPadrao.nome, 175, 80, { width: 180 });
  doc.font("Helvetica").fontSize(10);
  texto(doc, empresaPadrao.endereco, 175, 96, { width: 220 });
  texto(doc, empresaPadrao.cidade, 175, 111, { width: 220 });

  doc.font("Helvetica-Bold").fontSize(10);
  texto(doc, empresaPadrao.telefone, 360, 80, { width: 190, align: "right" });
  doc.font("Helvetica").fontSize(9);
  texto(doc, empresaPadrao.email, 360, 97, { width: 190, align: "right" });
  texto(doc, empresaPadrao.site, 305, 112, { width: 245, align: "right" });
  texto(doc, `CNPJ: ${empresaPadrao.cnpj}`, 360, 127, {
    width: 190,
    align: "right",
  });

  faixa(
    doc,
    `ORCAMENTO N ${orcamento.id_orcamento} REALIZADO EM ${formatarDataHora(orcamento.data_criacao)}`,
    160,
  );

  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(10);
  texto(doc, "VENCIMENTO", 95, 202, { width: 100, align: "center" });
  texto(doc, "ENTREGA", 245, 202, { width: 100, align: "center" });
  texto(doc, "TIPO", 420, 202, { width: 100, align: "center" });

  doc.font("Helvetica").fontSize(11);
  texto(doc, formatarData(orcamento.data_validade), 95, 218, {
    width: 100,
    align: "center",
  });
  texto(doc, formatarData(orcamento.prazo_entrega), 245, 218, {
    width: 100,
    align: "center",
  });
  texto(doc, "Cliente final", 420, 218, { width: 100, align: "center" });

  faixa(doc, "DADOS DO CLIENTE", 250);

  doc.fillColor("#111111").font("Helvetica").fontSize(11);
  texto(
    doc,
    cliente.nome || orcamento.nome_cliente || "Cliente nao informado",
    50,
    287,
    {
      width: 275,
    },
  );
  texto(doc, cliente.cpf_cnpj || "", 320, 303, { width: 150 });

  doc.moveTo(45, 347).lineTo(550, 347).strokeColor("#d5d5d5").stroke();
  texto(doc, cliente.endereco || "Endereco nao informado", 50, 357, {
    width: 500,
  });

  doc.moveTo(45, 382).lineTo(550, 382).strokeColor("#d5d5d5").stroke();
  texto(doc, cliente.telefone || "", 50, 392, { width: 220 });

  const fimTabela = desenharTabelaItens(doc, itens, 422);
  let y = desenharTotais(doc, valorTotal, fimTabela + 4);

  if (orcamento.observacoes) {
    y = garantirEspaco(doc, y, 72);
    faixa(doc, "OBSERVACOES", y);
    doc.fillColor("#111111").font("Helvetica").fontSize(9);
    texto(doc, orcamento.observacoes, 50, y + 32, { width: 495 });
  }

  rodape(doc);
  doc.end();
}

module.exports = {
  renderOrcamentoPdf,
};
