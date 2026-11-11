require('dotenv').config();
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET precisa estar definida antes de iniciar o backend.');
}
const { createApp } = require('./src/app');
const { startReportScheduler } = require('./src/services/reporting/reportScheduler');

const port = Number(process.env.PORT) || 3301;
startReportScheduler();
createApp().listen(port, () => {
  console.log(`Servidor Gráfica Máxima rodando na porta ${port}`);
});
