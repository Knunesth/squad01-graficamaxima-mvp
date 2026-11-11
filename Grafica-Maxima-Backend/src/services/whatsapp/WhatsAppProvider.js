const formatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function isCloudConfigured(env) {
  return env.WHATSAPP_MODE === "cloud" && env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID;
}

function periodLabel(report) {
  const period = report.tipo === "weekly" ? "semanal" : "mensal";
  return `relatório ${period}`;
}

class WhatsAppProvider {
  constructor(env = process.env, fetchImpl = globalThis.fetch) {
    this.env = env;
    this.fetch = fetchImpl;
  }

  async sendReport(to, report) {
    const mode = isCloudConfigured(this.env) ? "cloud" : "mock";
    const metrics = report.dados.metrics;
    if (mode === "mock") {
      console.info(`[WhatsApp mock] ${to}: ${report.resumo}`);
      return { mode, messageId: `mock-${Date.now()}` };
    }
    if (!this.env.WHATSAPP_TEMPLATE_NAME) {
      const error = new Error("Defina WHATSAPP_TEMPLATE_NAME para mensagens iniciadas pelo negócio.");
      error.retryable = false;
      throw error;
    }

    const version = this.env.WHATSAPP_API_VERSION || "v21.0";
    const recipient = to.replace(/^\+/, "");
    let response;
    try {
      response = await this.fetch(
        `https://graph.facebook.com/${version}/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "template",
          template: {
            name: this.env.WHATSAPP_TEMPLATE_NAME,
            language: { code: this.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR" },
            components: [{
              type: "body",
              parameters: [
                { type: "text", text: periodLabel(report) },
                { type: "text", text: `${report.data_inicio} a ${report.data_fim}` },
                { type: "text", text: String(metrics.finalizedSales) },
                { type: "text", text: currency.format(metrics.revenue) },
                { type: "text", text: `${formatter.format(metrics.conversionRate)}%` },
              ],
            }],
          },
        }),
        signal: AbortSignal.timeout(15000),
        },
      );
    } catch (error) {
      error.retryable = true;
      throw error;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error?.message || `WhatsApp Cloud API respondeu HTTP ${response.status}.`);
      error.status = response.status;
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    }
    return { mode, messageId: payload.messages?.[0]?.id || null };
  }
}

module.exports = { WhatsAppProvider, isCloudConfigured };
