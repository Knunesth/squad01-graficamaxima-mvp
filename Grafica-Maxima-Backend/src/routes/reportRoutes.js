const router = require("express").Router();
const { autenticar, apenasAdmin } = require("../middlewares/AuthRole");
const { HttpError, id, numero, texto } = require("../utils/validation");
const { getPeriod, todayAtTimezone } = require("../services/reporting/period");
const {
  calculateReport,
  getReport,
  getReportById,
  listReports,
} = require("../services/reporting/reportService");
const {
  e164,
  listRecipients,
  createRecipient,
  deactivateRecipient,
  sendReport,
  listDeliveries,
} = require("../services/whatsapp/deliveryService");

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

router.get("/recipients", async (req, res) => {
  res.json({
    mode: process.env.WHATSAPP_MODE === "cloud" && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
      ? "cloud"
      : "mock",
    itens: await listRecipients(),
  });
});

router.post("/recipients", async (req, res) => {
  const name = texto(req.body.nome, "Nome", 100, true);
  const phone = texto(req.body.telefone, "Telefone", 16, true);
  if (!e164.test(phone)) {
    throw new HttpError(422, "Informe o telefone em formato internacional, por exemplo +5561999999999.");
  }
  const recipient = await createRecipient({ name, phone });
  res.status(201).json(recipient);
});

router.delete("/recipients/:id", async (req, res) => {
  const removed = await deactivateRecipient(id(req.params.id));
  if (!removed) throw new HttpError(404, "Destinatário não encontrado.");
  res.json({ message: "Destinatário desativado." });
});

router.get("/:id/deliveries", async (req, res) => {
  const reportId = id(req.params.id);
  const report = await getReportById(reportId);
  if (!report) throw new HttpError(404, "Relatório não encontrado.");
  res.json({ itens: await listDeliveries(reportId) });
});

router.post("/:id/send", async (req, res) => {
  const report = await getReportById(id(req.params.id));
  if (!report) throw new HttpError(404, "Relatório não encontrado.");
  res.json(await sendReport(report));
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
