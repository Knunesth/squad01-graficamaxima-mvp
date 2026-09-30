// src/routes/configuracoesRoutes.js
// Montado em: /api/configuracoes (server.js)
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ========================================================
// GET /:aba — Busca os dados salvos por aba
// ========================================================
const buscarDadosAba = async (req, res) => {
    const { aba } = req.params;
    try {
        let query = '';
        let params = [];

        if (aba === 'Geral') {
            query = `
                SELECT 
                    id_acabamento AS id, 
                    descricao     AS subCategoria, 
                    tipo          AS tamFolha, 
                    custo_fixo    AS custoFixo, 
                    custo         AS custoUnitario, 
                    lucro_fixo    AS lucroFixo, 
                    lucro_unitario AS lucroUnitario 
                FROM acabamento 
                WHERE (nome = 'Geral' OR descricao IS NOT NULL)
                  AND descricao != '' 
                  AND descricao != 'NULL'
                  AND descricao IS NOT NULL
            `;
        } else if (aba === 'Corte. Esp' || aba === 'Corte e Vinco') {
            query = `
                SELECT 
                    id_corte       AS id, 
                    tipo           AS subCategoria, 
                    descricao      AS tamFolha, 
                    valor_fixo     AS custoFixo, 
                    custo_unitario AS custoUnitario, 
                    lucro_fixo     AS lucroFixo, 
                    lucro_unitario AS lucroUnitario 
                FROM corte 
                WHERE tipo != 'Item Sem Subcategoria' AND tipo IS NOT NULL
            `;
        } else {
            query = `
                SELECT 
                    id_acabamento  AS id, 
                    descricao      AS subCategoria, 
                    tipo           AS tamFolha, 
                    custo_fixo     AS custoFixo, 
                    custo          AS custoUnitario, 
                    lucro_fixo     AS lucroFixo, 
                    lucro_unitario AS lucroUnitario 
                FROM acabamento 
                WHERE nome = ? AND descricao != '' AND descricao IS NOT NULL
            `;
            params = [aba];
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Erro no GET de Configurações:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ========================================================
// POST /:aba — Salva novo item no banco
// ========================================================
const criarConfiguracao = async (req, res) => {
    const { aba } = req.params;

    const subCategoria   = req.body.subCategoria   || req.body.sub_categoria   || 'Item Sem Subcategoria';
    const tamFolha       = req.body.tamFolha       || req.body.tam_folha       || 'Unit';
    const custoFixo      = parseFloat(req.body.custoFixo      || req.body.custo_fixo      || 0);
    const custoUnitario  = parseFloat(req.body.custoUnitario  || req.body.custo_unitario  || req.body.custo || 0);
    const lucroFixo      = parseFloat(req.body.lucroFixo      || req.body.lucro_fixo      || 0);
    const lucroUnitario  = parseFloat(req.body.lucroUnitario  || req.body.lucro_unitario  || 0);

    try {
        if (aba === 'Corte. Esp' || aba === 'Corte e Vinco') {
            await db.query(
                'INSERT INTO corte (tipo, descricao, valor_fixo, custo_unitario, lucro_fixo, lucro_unitario) VALUES (?, ?, ?, ?, ?, ?)',
                [subCategoria, tamFolha, custoFixo, custoUnitario, lucroFixo, lucroUnitario]
            );
        } else {
            await db.query(
                'INSERT INTO acabamento (nome, tipo, descricao, custo_fixo, custo, lucro_fixo, lucro_unitario, tipo_cobranca) VALUES (?, ?, ?, ?, ?, ?, ?, "Unit")',
                [String(aba).substring(0, 50), String(tamFolha).substring(0, 30), String(subCategoria), custoFixo, custoUnitario, lucroFixo, lucroUnitario]
            );
        }
        res.status(201).json({ message: 'Criado com sucesso!' });
    } catch (error) {
        console.error('Erro no POST de Configurações:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ========================================================
// PUT /:aba/:id — Atualiza item no banco
// ========================================================
const atualizarConfiguracao = async (req, res) => {
    const { aba, id } = req.params;

    const subCategoria   = req.body.subCategoria   || req.body.sub_categoria   || '';
    const tamFolha       = req.body.tamFolha       || req.body.tam_folha       || '';
    const custoFixo      = parseFloat(req.body.custoFixo      || req.body.custo_fixo      || 0);
    const custoUnitario  = parseFloat(req.body.custoUnitario  || req.body.custo_unitario  || req.body.custo || 0);
    const lucroFixo      = parseFloat(req.body.lucroFixo      || req.body.lucro_fixo      || 0);
    const lucroUnitario  = parseFloat(req.body.lucroUnitario  || req.body.lucro_unitario  || 0);

    try {
        if (aba === 'Corte. Esp' || aba === 'Corte e Vinco') {
            await db.query(
                'UPDATE corte SET tipo = ?, descricao = ?, valor_fixo = ?, custo_unitario = ?, lucro_fixo = ?, lucro_unitario = ? WHERE id_corte = ?',
                [subCategoria, tamFolha, custoFixo, custoUnitario, lucroFixo, lucroUnitario, id]
            );
        } else {
            await db.query(
                'UPDATE acabamento SET tipo = ?, descricao = ?, custo_fixo = ?, custo = ?, lucro_fixo = ?, lucro_unitario = ? WHERE id_acabamento = ?',
                [tamFolha, subCategoria, custoFixo, custoUnitario, lucroFixo, lucroUnitario, id]
            );
        }
        res.json({ message: 'Atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro no PUT de Configurações:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ========================================================
// DELETE /:aba/:id — Remove item do banco
// ========================================================
const removerConfiguracao = async (req, res) => {
    const { aba, id } = req.params;
    try {
        if (aba === 'Corte. Esp' || aba === 'Corte e Vinco') {
            await db.query('DELETE FROM corte WHERE id_corte = ?', [id]);
        } else {
            await db.query('DELETE FROM acabamento WHERE id_acabamento = ?', [id]);
        }
        res.json({ message: 'Item removido com sucesso!' });
    } catch (error) {
        console.error('Erro no DELETE de Configurações:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Rotas únicas (sem duplicatas) — prefixo /api/configuracoes gerenciado no server.js
router.get('/:aba',      buscarDadosAba);
router.post('/:aba',     criarConfiguracao);
router.put('/:aba/:id',  atualizarConfiguracao);
router.delete('/:aba/:id', removerConfiguracao);

module.exports = router;