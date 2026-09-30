const router = require('express').Router();
const db = require('../config/db');
const categorias = require('../config/catalogo');
const { autenticar, apenasAdmin } = require('../middlewares/AuthRole');
const { texto, numero, id, HttpError } = require('../utils/validation');
function dados(body) {
  if (!categorias.includes(body.categoria)) throw new HttpError(422, 'Categoria inválida.');
  return [body.categoria, texto(body.nome, 'Subcategoria', 100, true), ...['custo_fixo', 'custo_unitario', 'lucro_fixo', 'lucro_unitario'].map(key => numero(body[key] ?? 0, key))];
}
router.get('/', autenticar, async (req, res) => {
  const [itens] = await db.query('SELECT * FROM material WHERE ativo = 1 ORDER BY categoria, nome');
  res.json({ categorias, itens });
});
router.post('/', [autenticar, apenasAdmin], async (req, res) => {
  const [result] = await db.query('INSERT INTO material (categoria, nome, custo_fixo, custo_unitario, lucro_fixo, lucro_unitario) VALUES (?, ?, ?, ?, ?, ?)', dados(req.body));
  res.status(201).json({ id_material: result.insertId });
});
router.put('/:id', [autenticar, apenasAdmin], async (req, res) => {
  const [result] = await db.query('UPDATE material SET categoria = ?, nome = ?, custo_fixo = ?, custo_unitario = ?, lucro_fixo = ?, lucro_unitario = ? WHERE id_material = ? AND ativo = 1', [...dados(req.body), id(req.params.id)]);
  if (!result.affectedRows) throw new HttpError(404, 'Material não encontrado.');
  res.json({ message: 'Material atualizado.' });
});
router.delete('/:id', [autenticar, apenasAdmin], async (req, res) => {
  const [result] = await db.query('UPDATE material SET ativo = 0 WHERE id_material = ? AND ativo = 1', [id(req.params.id)]);
  if (!result.affectedRows) throw new HttpError(404, 'Material não encontrado.');
  res.json({ message: 'Material removido do catálogo. Orçamentos anteriores foram preservados.' });
});
module.exports = router;
