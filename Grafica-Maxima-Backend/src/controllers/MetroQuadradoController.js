const service = require("../services/MetroQuadradoService");
const db = require("../config/db");
const { HttpError, numero, texto, id } = require("../utils/validation");
async function listarTipos(req, res) {
  const { rows: tipos } = await db.query(
    "SELECT tipo, preco_base_m2 FROM preco_m2 ORDER BY tipo",
  );
  res.json({ tipos });
}
async function calcular(req, res) {
  const { rows: tipos } = await db.query("SELECT tipo, preco_base_m2 FROM preco_m2");
  const precos = Object.fromEntries(
    tipos.map((t) => [t.tipo, Number(t.preco_base_m2)]),
  );
  const retorno = service.calcularMetroQuadrado(req.body, precos);
  if (!retorno.sucesso)
    return res
      .status(422)
      .json({ error: "Confira os dados do cálculo.", detalhes: retorno.erros });
  if (req.body.id_orcamento) {
    const recordId = id(req.body.id_orcamento);
    const conn = await db.getClient();
    try {
      await conn.beginTransaction();
      const { rows } = await conn.query(
        "SELECT * FROM orcamento WHERE id_orcamento = $1 FOR UPDATE",
        [recordId],
      );
      if (!rows.length) throw new HttpError(404, "Orçamento não encontrado.");
      const { rows: counts } = await conn.query(
        "SELECT COUNT(*)::int AS total FROM item WHERE id_orcamento = $1",
        [recordId],
      );
      if (counts[0].total >= 17)
        throw new HttpError(422, "O orçamento já tem 17 itens.");
      const r = retorno.resultado;
      await conn.query(
        "INSERT INTO item (id_orcamento,tipo_produto,quantidade,largura,altura,valor_unitario,valor_total,precificacao_snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          recordId,
          r.tipo_servico,
          r.quantidade,
          r.dimensoes.largura_m,
          r.dimensoes.altura_m,
          r.valor_unitario,
          r.valor_total,
          JSON.stringify(r),
        ],
      );
      const subtotal =
        Number(rows[0].subtotal ?? rows[0].valor_total) + r.valor_total;
      const desconto =
        rows[0].desconto_tipo === "percentual"
          ? (subtotal * Number(rows[0].desconto_valor)) / 100
          : Number(rows[0].desconto_valor);
      await conn.query(
        "UPDATE orcamento SET subtotal=$1,valor_total=$2,quantidade=quantidade+$3,versao=versao+1 WHERE id_orcamento=$4",
        [subtotal, subtotal - desconto, r.quantidade, recordId],
      );
      await conn.query(
        "INSERT INTO historico_log (id_usuario,tabela_afetada,id_registro,acao,data_hora) VALUES ($1,'orcamento',$2,'adicionar_m2',now())",
        [req.usuario.id_usuario, recordId],
      );
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  res.json({ calculo: retorno.resultado });
}
async function simular(req, res) {
  if (req.body.id_orcamento)
    throw new HttpError(422, "Simulação não vincula itens a orçamentos.");
  return calcular(req, res);
}
async function atualizarPreco(req, res) {
  const tipo = texto(req.body.tipo, "Tipo", 50, true);
  const preco = numero(req.body.preco_base_m2, "Preço por m²", { min: 0.0001 });
  const { rowCount } = await db.query(
    "UPDATE preco_m2 SET preco_base_m2 = $1 WHERE tipo = $2",
    [preco, tipo],
  );
  if (!rowCount)
    throw new HttpError(404, "Tipo de serviço não encontrado.");
  res.json({ message: "Preço atualizado." });
}
module.exports = { calcular, simular, listarTipos, atualizarPreco };
