class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function numero(value, campo, { min = 0, max = 1e9, inteiro = false } = {}) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw new HttpError(422, `${campo}: informe um número.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (inteiro && !Number.isSafeInteger(n))) throw new HttpError(422, `${campo}: valor inválido.`);
  return n;
}
const id = value => numero(value, 'ID', { min: 1, max: 2147483647, inteiro: true });
function texto(value, campo, max = 255, obrigatorio = false) {
  if (value == null && !obrigatorio) return '';
  if (typeof value !== 'string' || value.trim().length > max || (obrigatorio && !value.trim())) throw new HttpError(422, `${campo}: texto inválido${obrigatorio ? ' ou obrigatório' : ''}.`);
  return value.trim();
}
function data(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new HttpError(422, 'Data inválida.');
  return value;
}
const STATUS = ['Aberto', 'Pré-Orçamento', 'Em análise', 'Aprovado', 'Não aprovado', 'Finalizado', 'Inativo'];
function status(value) {
  if (!STATUS.includes(value)) throw new HttpError(422, 'Status inválido.');
  return value;
}
const dinheiro = value => Math.round((value + Number.EPSILON) * 10000) / 10000;
module.exports = { HttpError, numero, id, texto, data, status, STATUS, dinheiro };
