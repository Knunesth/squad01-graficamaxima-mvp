const { capturarSaida } = require('../helpers/env');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  WhatsAppProvider,
  isCloudConfigured,
  maskedPhone,
  retryAfterMilliseconds,
} = require('../../src/services/whatsapp/WhatsAppProvider');

const relatorio = {
  tipo: 'weekly',
  data_inicio: '2026-11-02',
  data_fim: '2026-11-08',
  dados: { metrics: { finalizedSales: 3, revenue: 1234.5, conversionRate: 42.5 } },
};
const envCloud = {
  WHATSAPP_MODE: 'cloud',
  WHATSAPP_ACCESS_TOKEN: 'token-de-teste',
  WHATSAPP_PHONE_NUMBER_ID: '1234567890',
  WHATSAPP_TEMPLATE_NAME: 'graficamaxima_relatorio',
  WHATSAPP_API_VERSION: 'v21.0',
};

function resposta(status, payload = {}, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => payload,
  };
}

async function erroDe(promessa) {
  try {
    await promessa;
  } catch (error) {
    return error;
  }
  throw new Error('Era esperado que o envio falhasse.');
}

describe('WhatsApp — utilitários', () => {
  it('mascara telefones brasileiros e internacionais', () => {
    assert.equal(maskedPhone('+5561999998888'), '+55 61 *****-8888');
    assert.equal(maskedPhone('+15551234567'), '+155 *****-4567');
    assert.ok(!maskedPhone('+5561999998888').includes('99999'));
  });

  it('só considera o modo cloud com token e número configurados', () => {
    assert.ok(isCloudConfigured(envCloud));
    assert.ok(!isCloudConfigured({ ...envCloud, WHATSAPP_MODE: 'mock' }));
    assert.ok(!isCloudConfigured({ ...envCloud, WHATSAPP_ACCESS_TOKEN: '' }));
    assert.ok(!isCloudConfigured({ ...envCloud, WHATSAPP_PHONE_NUMBER_ID: undefined }));
    assert.ok(!isCloudConfigured({}));
  });

  it('interpreta Retry-After em segundos, em data HTTP ou ausente', () => {
    assert.equal(retryAfterMilliseconds(resposta(429, {}, { 'retry-after': '5' })), 5000);
    assert.equal(retryAfterMilliseconds(resposta(429)), undefined);
    assert.equal(retryAfterMilliseconds(resposta(429, {}, { 'retry-after': 'depois' })), undefined);
    const emData = retryAfterMilliseconds(resposta(429, {}, { 'retry-after': new Date(Date.now() + 60000).toUTCString() }));
    assert.ok(emData > 50000 && emData <= 60000, `recebido ${emData}`);
    assert.equal(retryAfterMilliseconds(resposta(429, {}, { 'retry-after': new Date(Date.now() - 60000).toUTCString() })), 0);
  });
});

describe('WhatsAppProvider.sendReport — modo mock', () => {
  it('não chama a rede e registra apenas o telefone mascarado', async () => {
    let chamadas = 0;
    const provider = new WhatsAppProvider({ WHATSAPP_MODE: 'mock' }, async () => { chamadas += 1; });
    let resultado;
    const saida = await capturarSaida(async () => {
      resultado = await provider.sendReport('+5561999998888', relatorio, { deliveryId: 7 });
    });
    assert.equal(chamadas, 0);
    assert.equal(resultado.mode, 'mock');
    assert.match(resultado.messageId, /^mock-\d+$/);
    const linha = JSON.parse(saida.stdout.trim());
    assert.equal(linha.event, 'whatsapp_mock_send');
    assert.equal(linha.deliveryId, 7);
    assert.equal(linha.maskedPhone, '+55 61 *****-8888');
    assert.ok(!saida.stdout.includes('+5561999998888'));
  });
});

describe('WhatsAppProvider.sendReport — modo cloud', () => {
  it('envia o template para a Graph API com os cinco parâmetros', async () => {
    const chamadas = [];
    const provider = new WhatsAppProvider(envCloud, async (url, options) => {
      chamadas.push({ url, options });
      return resposta(200, { messages: [{ id: 'wamid.123' }] });
    });
    const resultado = await provider.sendReport('+5561999998888', relatorio);
    assert.deepEqual(resultado, { mode: 'cloud', messageId: 'wamid.123' });
    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0].url, 'https://graph.facebook.com/v21.0/1234567890/messages');
    assert.equal(chamadas[0].options.method, 'POST');
    assert.equal(chamadas[0].options.headers.Authorization, 'Bearer token-de-teste');
    const corpo = JSON.parse(chamadas[0].options.body);
    assert.equal(corpo.messaging_product, 'whatsapp');
    assert.equal(corpo.to, '5561999998888');
    assert.equal(corpo.template.name, 'graficamaxima_relatorio');
    assert.equal(corpo.template.language.code, 'pt_BR');
    const parametros = corpo.template.components[0].parameters.map((p) => p.text);
    assert.equal(parametros.length, 5);
    assert.equal(parametros[0], 'relatório semanal');
    assert.equal(parametros[1], '2026-11-02 a 2026-11-08');
    assert.equal(parametros[2], '3');
    assert.match(parametros[3], /^R\$\s1\.234,50$/);
    assert.equal(parametros[4], '42,5%');
  });

  it('exige o nome do template e não tenta de novo', async () => {
    const provider = new WhatsAppProvider({ ...envCloud, WHATSAPP_TEMPLATE_NAME: '' }, async () => resposta(200));
    const erro = await erroDe(provider.sendReport('+5561999998888', relatorio));
    assert.equal(erro.retryable, false);
    assert.match(erro.message, /WHATSAPP_TEMPLATE_NAME/);
  });

  it('marca 429 e 5xx como repetíveis e 4xx como definitivos', async () => {
    const enviar = (status, headers) => erroDe(
      new WhatsAppProvider(envCloud, async () => resposta(status, { error: { message: `falha ${status}` } }, headers))
        .sendReport('+5561999998888', relatorio),
    );
    const limite = await enviar(429, { 'retry-after': '2' });
    assert.equal(limite.retryable, true);
    assert.equal(limite.retryAfterMs, 2000);
    assert.equal(limite.status, 429);
    assert.equal((await enviar(503)).retryable, true);
    const invalido = await enviar(400);
    assert.equal(invalido.retryable, false);
    assert.equal(invalido.message, 'falha 400');
    assert.equal((await enviar(401)).retryable, false);
  });

  it('usa mensagem padrão quando a API não devolve JSON de erro', async () => {
    const provider = new WhatsAppProvider(envCloud, async () => ({
      ok: false, status: 502, headers: new Headers(), json: async () => { throw new Error('não é JSON'); },
    }));
    const erro = await erroDe(provider.sendReport('+5561999998888', relatorio));
    assert.equal(erro.message, 'WhatsApp Cloud API respondeu HTTP 502.');
    assert.equal(erro.retryable, true);
  });

  it('trata falha de rede como repetível', async () => {
    const provider = new WhatsAppProvider(envCloud, async () => { throw new TypeError('fetch failed'); });
    const erro = await erroDe(provider.sendReport('+5561999998888', relatorio));
    assert.equal(erro.retryable, true);
  });
});
