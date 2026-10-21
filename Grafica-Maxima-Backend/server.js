require('dotenv').config();
const { createApp } = require('./src/app');

const port = Number(process.env.PORT) || 3301;
createApp().listen(port, () => {
  console.log(`Servidor Gráfica Máxima rodando na porta ${port}`);
});
