const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const [algorithm, salt, value] = String(stored).split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(value || '')) {
    await derive(password, 'invalid-user-placeholder', 64);
    return false;
  }
  const hash = await derive(password, salt, 64);
  return timingSafeEqual(hash, Buffer.from(value, 'hex'));
}
module.exports = { hashPassword, verifyPassword };
