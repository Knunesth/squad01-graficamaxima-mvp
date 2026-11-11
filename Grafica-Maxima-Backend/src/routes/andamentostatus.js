const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/status/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT id, cliente, status_passo FROM orcamentos WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado." });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Erro ao buscar status do orçamento:", error);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
});

router.put("/status/:id", async (req, res) => {
  const { id } = req.params;
  const { novoStatus } = req.body;

  if (!novoStatus || novoStatus < 1 || novoStatus > 4) {
    return res
      .status(400)
      .json({ error: "Etapa inválida. Escolha entre 1 e 4." });
  }

  try {
    const [result] = await pool.query(
      "UPDATE orcamentos SET status_passo = ? WHERE id = ?",
      [novoStatus, id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Orçamento não encontrado para atualizar." });
    }

    return res.json({
      success: true,
      message: `Status atualizado para a etapa ${novoStatus}`,
      statusAtualizado: parseInt(novoStatus),
    });
  } catch (error) {
    console.error("Erro ao atualizar status no banco:", error);
    return res.status(500).json({ error: "Erro interno ao salvar no banco." });
  }
});

module.exports = router;
