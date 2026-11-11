# Roteiro para publicar — Gráfica Máxima

Roteiro curto, na ordem em que as coisas precisam acontecer. Os detalhes (segurança, backup, rollback, custos) estão em [DEPLOY.md](../DEPLOY.md).

Arquitetura: banco no **Supabase**, API no **Railway**, site no **Netlify**. O site e a API ficam no mesmo endereço: o Netlify repassa `/api/*` para o Railway.

O Docker **não é necessário** para publicar. Ele só serve para rodar o banco na sua máquina.

## 0. Antes de começar

- [ ] Liberar espaço no disco C: (hoje com menos de 1 GB livre). Sem espaço, `npm ci` e o build podem falhar.
- [ ] Fazer commit do trabalho da branch `feat/entregaveis-residencia` e juntar na `main`.
- [ ] Conferir na pasta de cada projeto: backend `npm test` e `npm run build`; frontend `npm run lint`, `npm test` e `npm run build`.
- [ ] Ter conta no Supabase, no Railway e no Netlify.

## 1. Banco (Supabase)

- [ ] Criar o projeto na região **São Paulo (sa-east-1)**, com senha do banco nova e longa (32+ caracteres).
- [ ] Em *Project Settings → Database*, copiar a URL do **pooler em modo sessão** (porta `5432`). Não usar o pooler de transação (porta `6543`): o sistema usa travas que ele não suporta.
- [ ] Em *API Settings*, desligar a Data API (o sistema não usa).

## 2. API (Railway)

- [ ] Criar um serviço apontando para a pasta `Grafica-Maxima-Backend` (pelo GitHub com *Root Directory* = `Grafica-Maxima-Backend`, ou com `railway up` de dentro da pasta).
- [ ] Cadastrar as variáveis do serviço:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL do passo 1 |
| `DATABASE_SSL` | `verify-full` (se a conexão recusar o certificado, cole a CA do Supabase em `DATABASE_SSL_CA`) |
| `JWT_SECRET` | segredo novo; gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | `production` |
| `TZ` e `REPORT_TIMEZONE` | `America/Sao_Paulo` |
| `TRUST_PROXY` | `1` |
| `FRONTEND_URL` e `CORS_ORIGINS` | endereço do site no Netlify (preencher depois do passo 3) |
| `WHATSAPP_MODE` | `mock` |

- [ ] Não defina `PORT`: o Railway fornece.
- [ ] Manter **uma única instância** (o limite de tentativas de login fica em memória).
- [ ] Gerar o domínio público do serviço e abrir `https://SEU-DOMINIO/health`: precisa responder `{"status":"ok"}`. As migrations rodam sozinhas a cada deploy.

**Nunca reutilize o `JWT_SECRET` nem a senha de banco antigos**: eles estão no histórico do git.

## 3. Site (Netlify)

- [ ] Em `Grafica-Maxima-FrontEnd/netlify.toml`, colocar **antes** da regra `/*` a regra que repassa a API (troque pelo domínio do passo 2):

```toml
[[redirects]]
  from = "/api/*"
  to = "https://SEU-DOMINIO.up.railway.app/api/:splat"
  status = 200
  force = true
```

- [ ] Criar o site com *Base directory* = `Grafica-Maxima-FrontEnd`, build `npm run build`, publicação `dist`.
- [ ] **Não** definir `VITE_API_URL` no Netlify: em produção o site chama `/api` no próprio endereço.
- [ ] Voltar ao Railway e preencher `FRONTEND_URL` e `CORS_ORIGINS` com o endereço `https://....netlify.app` (sem barra no fim). Fazer novo deploy da API.

## 4. Primeiro administrador

No seu terminal, dentro de `Grafica-Maxima-Backend`, com a URL de produção só nesta sessão:

```powershell
$env:DATABASE_URL = "URL-DO-SUPABASE"
$env:DATABASE_SSL = "verify-full"
$env:BOOTSTRAP_ADMIN_LOGIN = "admin"
$env:BOOTSTRAP_ADMIN_PASSWORD = "uma-senha-com-16-caracteres-ou-mais"
npm run bootstrap-admin
```

- [ ] Fechar o terminal depois, para as variáveis sumirem.
- [ ] **Não rodar `npm run seed` em produção** (são dados de demonstração).

## 5. Conferir no ar

- [ ] Entrar com o administrador e trocar a senha em Configurações.
- [ ] Cadastrar um cliente, criar um orçamento, aprovar, gerar o PDF e finalizar.
- [ ] Abrir o Dashboard e gerar um relatório semanal.
- [ ] Criar uma conta de atendente pelo cadastro, liberar em Usuários e conferir que ela não vê Relatórios.
- [ ] Cadastrar o endereço `/health` em um monitor (UptimeRobot ou similar).

## Limites do plano gratuito

- Supabase Free pausa o projeto depois de uma semana sem uso e não faz backup automático. Use `npm run backup-db` com regularidade.
- Railway Trial dá um crédito inicial; depois é cobrado por uso.
- Confira os preços atuais nas páginas de cada serviço antes de contratar.
