const router = require("express").Router();
const db = require("../config/db");
const { autenticar, apenasAdmin } = require("../middlewares/AuthRole");
const { HttpError, id, numero } = require("../utils/validation");
const { getPeriod, todayAtTimezone } = require("../services/reporting/period");
const {
  calculateReport,
  getReport,
  getReportById,
  listReports,
} = require("../services/reporting/reportService");

router.use(autenticar, apenasAdmin);

function reportType(value, required = true) {
  if (!value && !required) return undefined;
  if (!['weekly', 'monthly'].includes(value)) {
    throw new HttpError(422, "Tipo de relatório inválido. Use weekly ou monthly.");
  }
  return value;
}

router.get("/history", async (req, res) => {
  const type = reportType(req.query.type, false);
  const limit = numero(req.query.limit ?? 12, "Limite", {
    min: 1,
    max: 100,
    inteiro: true,
  });
  res.json({ itens: await listReports({ type, limit }) });
});

router.post("/generate", async (req, res) => {
  const type = reportType(req.body.type);
  const date = req.body.date || todayAtTimezone();
  getPeriod(type, date);
  const report = await calculateReport(type, date, req.usuario.id_usuario);
  res.status(201).json(report);
});

router.get("/", async (req, res) => {
  const type = reportType(req.query.type);
  const date = req.query.date || todayAtTimezone();
  getPeriod(type, date);
  res.json(await getReport(type, date, req.usuario.id_usuario));
});

router.get("/:id", async (req, res) => {
  const report = await getReportById(id(req.params.id));
  if (!report) throw new HttpError(404, "Relatório não encontrado.");
  res.json(report);
});

module.exports = router;
