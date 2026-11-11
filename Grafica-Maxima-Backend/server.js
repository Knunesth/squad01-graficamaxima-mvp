require('dotenv').config();
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET precisa estar definida antes de iniciar o backend.');
}
const { createApp } = require('./src/app');

const port = Number(process.env.PORT) || 3301;
createApp().listen(port, () => {
  console.log(`Servidor Gráfica Máxima rodando na porta ${port}`);
});
