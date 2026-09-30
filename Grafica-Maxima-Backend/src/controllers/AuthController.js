const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { HttpError, texto } = require('../utils/validation');
const { hashPassword, verifyPassword } = require('../services/password');
const cookieOptions = () => ({ httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 * 1000 });
const attempts = new Map();
function limitarLogin(req, res, next) {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
  if (++entry.count > 20) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
  attempts.set(key, entry);
  next();
}
async function login(req, res) {
  const login = texto(req.body.login || req.body.email, 'Login', 100, true).toLowerCase();
  const senha = texto(req.body.senha, 'Senha', 256, true);
  const [rows] = await db.query('SELECT id_usuario, nome, login, tipo, ativo, senha_hash FROM usuario WHERE login = ? OR email = ? LIMIT 1', [login, login]);
  const user = rows[0];
  const valid = await verifyPassword(senha, user?.senha_hash);
  if (!valid || !user?.ativo) throw new HttpError(401, 'Login ou senha inválidos, ou conta ainda não liberada.');
  const token = jwt.sign({ sub: String(user.id_usuario) }, process.env.JWT_SECRET, { expiresIn: '8h', algorithm: 'HS256' });
  res.cookie('grafica_session', token, cookieOptions());
  res.json({ usuario: { id_usuario: user.id_usuario, nome: user.nome, login: user.login, tipo: user.tipo } });
}
async function registrar(req, res) {
  const login = texto(req.body.login, 'Login', 80, true).toLowerCase();
  const senha = texto(req.body.senha, 'Senha', 256, true);
  if (!/^[a-z0-9_.-]{3,80}$/.test(login)) throw new HttpError(422, 'Use de 3 a 80 letras, números, pontos, traços ou sublinhados no login.');
  if (senha.length < 12) throw new HttpError(422, 'A senha deve ter pelo menos 12 caracteres.');
  const [existing] = await db.query('SELECT id_usuario FROM usuario WHERE login = ?', [login]);
  if (existing.length) throw new HttpError(409, 'Esse login já está cadastrado.');
  await db.query('INSERT INTO usuario (nome, login, senha_hash, tipo, ativo) VALUES (?, ?, ?, ?, 0)', [login, login, await hashPassword(senha), 'atendente']);
  res.status(201).json({ message: 'Conta criada. Aguarde a liberação pelo administrador para entrar.' });
}
function logout(req, res) { res.clearCookie('grafica_session', { ...cookieOptions(), maxAge: undefined }); res.json({ message: 'Sessão encerrada.' }); }
module.exports = { login, registrar, logout, limitarLogin };
