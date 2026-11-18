# Tutorial — ligar o envio real de relatórios por WhatsApp

Hoje o sistema está em **modo simulado**: ao enviar, ele só registra o envio e a tela avisa "Envio simulado e registrado". Este tutorial leva do zero até a primeira mensagem real, usando a **API oficial da Meta (WhatsApp Cloud API)**.

Tempo estimado: 1 a 2 horas, mais até um dia de espera para a aprovação do modelo de mensagem.

> **Atenção.** As telas da Meta mudam com frequência. Os nomes abaixo estão corretos na data deste documento (17/11/2026); se algo estiver diferente, siga o guia oficial: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started

## O que o sistema envia

A administradora recebe, a cada semana (segunda, 8h) e a cada mês (dia 1, 8h), ou quando clica em **Enviar por WhatsApp agora**, uma mensagem com cinco informações:

1. tipo do relatório (semanal ou mensal);
2. período, no formato `01/11/2026 a 30/11/2026`;
3. quantidade de vendas finalizadas;
4. receita;
5. conversão.

Como é uma mensagem que a empresa inicia, o WhatsApp exige um **modelo de mensagem aprovado** (*template*). Sem ele, a Meta recusa o envio.

## Antes de começar

| Você precisa de | Observação |
|---|---|
| Uma conta no Facebook | Usada para entrar no painel de desenvolvedores |
| Um portfólio empresarial na Meta (Meta Business) | Pode ser criado no caminho; para número próprio, a Meta pode pedir verificação da empresa |
| Um número de telefone | Para testar, a Meta fornece um número de teste. Para uso real, é preciso um número próprio, que não pode estar em uma conta comum do WhatsApp (confirme as regras de migração e do modo "coexistência" na documentação) |
| Acesso ao painel do Railway | Onde ficam as variáveis do sistema |

**Segredos.** O token de acesso dá poder de enviar mensagens em nome da empresa. Cole-o **somente** no Railway. Não o coloque no código, no GitHub, em conversas nem em prints.

## Passo 1 — Criar o app na Meta

1. Entre em https://developers.facebook.com e faça login.
2. Clique em **Meus apps** → **Criar app**.
3. Escolha o caso de uso **Conectar-se com clientes pelo WhatsApp** (ou "Other" → "Business", se o painel for o antigo) e dê o nome do app, por exemplo `Gráfica Máxima Relatórios`.
4. Associe o app ao seu portfólio empresarial.
5. No painel do app, abra **WhatsApp** → **Introdução** (*Get started* ou *API Setup*).

## Passo 2 — Anotar o ID do número e fazer um envio de teste

Na página **API Setup** do WhatsApp:

1. Em **De** (*From*), selecione o número de teste (ou adicione o seu). Logo abaixo aparece o **ID do número de telefone** (*Phone number ID*). **Anote:** ele vai para `WHATSAPP_PHONE_NUMBER_ID`.
2. Anote também o **ID da conta do WhatsApp Business** (*WhatsApp Business Account ID*).
3. Em **Para** (*To*), adicione o número que vai receber o teste (o seu) e confirme o código que chega no WhatsApp. Com o número de teste, **só números cadastrados aqui recebem mensagens**.
4. Clique em **Enviar mensagem** (modelo `hello_world`). Se a mensagem chegar no seu WhatsApp, a conta está funcionando.

O token temporário que aparece nessa página dura cerca de 24 horas e **não serve** para o sistema. O próximo passo cria o definitivo.

## Passo 3 — Gerar o token permanente

1. Abra as **Configurações do negócio** (Meta Business Suite → Configurações) em https://business.facebook.com/settings.
2. Vá em **Usuários** → **Usuários do sistema** → **Adicionar**.
3. Dê um nome (por exemplo `relatorios-grafica`) e a função **Administrador**. Crie.
4. Clique em **Adicionar ativos**, escolha **Apps**, selecione o app do Passo 1 e dê **controle total**. Repita em **Contas do WhatsApp** com a sua conta.
5. Clique em **Gerar token**. Escolha o app e a expiração **Nunca**.
6. Marque as permissões **`whatsapp_business_messaging`** e **`whatsapp_business_management`**.
7. Clique em **Gerar token** e **copie na hora**: ele não é mostrado de novo. Guarde-o direto onde vai usar (Passo 6). Esse valor vai para `WHATSAPP_ACCESS_TOKEN`.

## Passo 4 — Criar e aprovar o modelo de mensagem

1. Abra o **WhatsApp Manager** (https://business.facebook.com/wa/manage/message-templates) e escolha **Modelos de mensagem** → **Criar modelo**.
2. **Categoria:** Utilidade (*Utility*). Não use texto de venda ou promoção: a Meta reclassifica o modelo como Marketing, que é mais caro e mais restrito.
3. **Nome:** `graficamaxima_relatorio` (minúsculas, sem espaços). Esse é o valor de `WHATSAPP_TEMPLATE_NAME`.
4. **Idioma:** Português (Brasil), código `pt_BR`.
5. **Corpo** (cole exatamente, com as cinco variáveis):

```text
Olá! Segue seu {{1}} da Gráfica Máxima, referente a {{2}}. Vendas finalizadas: {{3}}. Receita: {{4}}. Conversão: {{5}}. Acesse o painel para consultar os detalhes.
```

6. **Exemplos das variáveis.** A Meta pede um exemplo para cada uma; sem eles o modelo costuma ser recusado:

| Variável | Exemplo |
|---|---|
| `{{1}}` | `relatório mensal` |
| `{{2}}` | `01/11/2026 a 30/11/2026` |
| `{{3}}` | `12` |
| `{{4}}` | `R$ 8.562,50` |
| `{{5}}` | `50%` |

7. Envie para análise. A aprovação costuma sair em minutos ou em até cerca de 24 horas. Quando o status for **Aprovado**, siga.

Regras que evitam recusa: variáveis numeradas em sequência, o texto não começa nem termina com variável (o texto acima já está certo) e as variáveis não ficam coladas umas nas outras. **Não altere a ordem nem a quantidade das variáveis**, porque o sistema envia exatamente cinco, nessa ordem.

## Passo 5 — Escolher quem recebe

A API oficial envia para **números individuais**, no formato internacional, com `+`, código do país e DDD: `+5561999999999`.

- **Grupo de WhatsApp não é suportado** pelo sistema. A Meta tem uma API de grupos, mas ela exige conta de negócio oficial, entrada por convite e limites de participantes. Para o relatório chegar a várias pessoas, cadastre o número de cada uma.
- **Limites do sistema:** até 5 destinatários ativos e 10 no total (configuráveis por `MAX_RECIPIENTS_ACTIVE` e `MAX_RECIPIENTS_TOTAL`).
- Com o **número de teste da Meta**, cada destinatário também precisa estar cadastrado no painel da Meta (Passo 2).

## Passo 6 — Configurar o Railway

1. No Railway, abra o serviço da API → aba **Variables** → **Raw Editor**.
2. **Acrescente** estas linhas, sem apagar as que já existem, e troque `WHATSAPP_MODE=mock` por `cloud`:

```
WHATSAPP_MODE=cloud
WHATSAPP_ACCESS_TOKEN=cole-aqui-o-token-do-passo-3
WHATSAPP_PHONE_NUMBER_ID=cole-aqui-o-id-do-passo-2
WHATSAPP_TEMPLATE_NAME=graficamaxima_relatorio
WHATSAPP_TEMPLATE_LANGUAGE=pt_BR
WHATSAPP_API_VERSION=v21.0
```

3. Opcional: `WHATSAPP_DEFAULT_RECIPIENT=+5561999999999` define um destinatário padrão sem cadastrá-lo na tela.
4. Clique em **Update Variables** e depois em **Deploy**. Espere ficar verde.

O sistema só entra em modo real se `WHATSAPP_MODE=cloud` **e** o token **e** o ID do número estiverem preenchidos. Se faltar algum, ele volta ao modo simulado sozinho.

## Passo 7 — Testar no sistema

1. Entre como administradora e abra **Relatórios**.
2. Em **Destinatários e envios**, cadastre o número que vai receber (formato `+55...`).
3. Clique em **Enviar por WhatsApp agora**.
4. O aviso deve **deixar de dizer "simulado"** e a mensagem deve chegar no WhatsApp em alguns segundos.
5. Confira o **histórico** de envios: o modo deve aparecer como real, e o status como "Enviado".

"Enviado" significa que a Meta **aceitou** a mensagem. A confirmação de leitura ou entrega por *webhook* não faz parte deste sistema.

Se você clicar de novo para o mesmo relatório e número, o sistema pede confirmação antes de reenviar, para não duplicar.

## Se algo der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| A tela continua dizendo "simulado" | Falta uma das três variáveis, ou o deploy não terminou | Confira `WHATSAPP_MODE=cloud`, o token e o ID; espere o deploy ficar verde |
| Erro 131030 (número fora da lista permitida) | Número de teste: o destinatário não foi cadastrado na Meta | Cadastre-o no Passo 2 |
| Erro 132001 (modelo não existe) | Nome ou idioma diferentes do modelo na Meta | Confira `WHATSAPP_TEMPLATE_NAME` e `WHATSAPP_TEMPLATE_LANGUAGE` |
| Erro 132000 (número de parâmetros) | O modelo não tem exatamente 5 variáveis | Recrie o modelo como no Passo 4 |
| Erro 190 (token inválido ou expirado) | Foi usado o token temporário ou ele foi revogado | Gere de novo o token do usuário do sistema (Passo 3) |
| Modelo recusado | Texto com cara de promoção, sem exemplos ou variáveis fora de ordem | Corrija e reenvie; mantenha a categoria Utilidade |
| Mensagem não chega e o status é "Enviado" | Número errado, bloqueio do destinatário ou atraso | Confira o número e peça para a pessoa verificar bloqueios |
| Envio falha com erro 429 ou 5xx | Limite ou instabilidade da Meta | O sistema tenta de novo até 3 vezes, com espera crescente; aguarde |

Os detalhes técnicos de cada falha ficam no histórico de envios da tela **Relatórios** e nos logs do Railway (sem o número completo, por privacidade).

## Custos e limites

A Meta cobra por mensagem de modelo iniciada pela empresa, conforme a categoria e o país, e a tabela muda ao longo do ano. Confira os valores atuais em https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing. Com uma mensagem por semana e outra por mês para poucas pessoas, o volume é pequeno.

## Lista de conferência

- [ ] App criado e número de teste funcionando (mensagem `hello_world` recebida)
- [ ] ID do número e ID da conta anotados
- [ ] Token permanente do usuário do sistema gerado e guardado só no Railway
- [ ] Modelo `graficamaxima_relatorio` aprovado, com 5 variáveis e categoria Utilidade
- [ ] Variáveis configuradas no Railway e deploy concluído
- [ ] Destinatário cadastrado em **Relatórios**
- [ ] Mensagem real recebida e histórico mostrando o envio

## Como desligar

No Railway, troque `WHATSAPP_MODE=cloud` por `WHATSAPP_MODE=mock` e faça o deploy. O sistema volta a só registrar os envios, sem mandar nada.

Documentos relacionados: [README](../README.md) (seção WhatsApp Cloud API), [DEPLOY.md](../DEPLOY.md) e [PUBLICAR.md](PUBLICAR.md).
