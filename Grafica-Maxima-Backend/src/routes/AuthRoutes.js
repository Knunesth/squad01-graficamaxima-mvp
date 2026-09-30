const router = require('express').Router();
const auth = require('../controllers/AuthController');
const { autenticar, apenasAdmin } = require('../middlewares/AuthRole');
const db = require('../config/db');
const { id, HttpError } = require('../utils/validation');
router.post('/login', auth.limitarLogin, auth.login);
router.post('/register', auth.limitarLogin, auth.registrar);
router.post('/logout', auth.logout);
router.get('/me', autenticar, (req, res) => res.json({ usuario: req.usuario }));
router.get('/usuarios', autenticar, apenasAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT id_usuario, nome, login, tipo, ativo FROM usuario ORDER BY id_usuario DESC');
  res.json(rows);
});
router.patch('/usuarios/:id', autenticar, apenasAdmin, async (req, res) => {
  const userId = id(req.params.id);
  if (userId === req.usuario.id_usuario) throw new HttpError(409, 'Não altere suas próprias permissões por esta tela.');
  if (!['admin', 'atendente'].includes(req.body.tipo) || typeof req.body.ativo !== 'boolean') throw new HttpError(422, 'Permissões inválidas.');
  const [result] = await db.query('UPDATE usuario SET tipo = ?, ativo = ? WHERE id_usuario = ?', [req.body.tipo, req.body.ativo, userId]);
  if (!result.affectedRows) throw new HttpError(404, 'Usuário não encontrado.');
  res.json({ message: 'Permissões atualizadas.' });
});
module.exports = router;
