const mysql = require('mysql2/promise');
require('dotenv').config();
let pool;
let inicializando;
async function inicializarBanco() {
  if (pool) return pool;
  if (inicializando) return inicializando;
  inicializando = (async () => {
    const portas = process.env.DB_PORT ? [Number(process.env.DB_PORT)] : [3306, 3312];
    for (let i = 0; i < portas.length; i++) {
      const candidato = mysql.createPool({
        host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'graficamaxima',
        port: portas[i], waitForConnections: true, connectionLimit: 10, queueLimit: 100,
        dateStrings: true, connectTimeout: 5000,
      });
      try {
        const conn = await candidato.getConnection();
        conn.release();
        pool = candidato;
        return pool;
      } catch (error) {
        await candidato.end();
        if (error.code !== 'ECONNREFUSED' || i === portas.length - 1) throw error;
      }
    }
  })();
  try { return await inicializando; } finally { inicializando = null; }
}
module.exports = {
  inicializarBanco,
  query: async (sql, params) => (await inicializarBanco()).query(sql, params),
  getConnection: async () => (await inicializarBanco()).getConnection(),
  end: async () => { if (pool) { await pool.end(); pool = null; } },
};
