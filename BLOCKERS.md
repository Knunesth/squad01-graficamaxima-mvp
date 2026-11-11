# Bloqueios e pendências de produção

## Acesso aos provedores

- Nenhuma CLI dos provedores estava instalada e as variáveis de autenticação/bootstrap não estavam definidas no ambiente do processo. Assim, não foi possível executar `supabase orgs list`, `supabase projects list`, `railway whoami/list` ou `netlify status`, nem criar, modificar ou implantar recursos.
- Ação para retomar: disponibilizar `SUPABASE_ACCESS_TOKEN`, `RAILWAY_API_TOKEN`, `NETLIFY_AUTH_TOKEN`, `BOOTSTRAP_ADMIN_LOGIN` e `BOOTSTRAP_ADMIN_PASSWORD` como variáveis de ambiente da sessão Codex. Em seguida instalar as CLIs oficiais e confirmar a identidade nas contas antes de seguir com alterações.
- Não foi criada organização Supabase, projeto Supabase, serviço Railway, projeto Vercel, senha de banco de produção ou conta admin. Nenhuma migration foi executada em produção.
- Não foi possível confirmar as configurações de Data API, exposição automática de tabelas, RLS, política de backups, região/limitações da conta Railway ou custos atuais. Nenhum dado de demonstração foi enviado a uma base de produção.
- Vercel Hobby não é apropriado para este sistema comercial: a regra oficial restringe o plano a uso pessoal/não comercial. Como compra de plano foi proibida, o frontend foi preparado para Netlify Free (limite atual de 300 créditos/mês, sem cobrança por ultrapassagem); falta `NETLIFY_AUTH_TOKEN` para autenticar e criar o site. O `vercel.json`/`.vercelignore` ficam como configuração compatível com o pedido inicial, mas não serão usados no deploy.
- O deploy final ainda depende do domínio público do backend para completar a regra `/api/*` no host do frontend. A configuração atual inclui apenas o fallback SPA.
- O Supabase Free pode pausar projetos inativos após uma semana e não oferece backups automáticos; a política real da conta não pôde ser verificada. Se a continuidade e backups automáticos forem requisito de produção, o Pro começa em US$ 25/mês, mas nenhum upgrade foi feito.
- A documentação pública da Railway lista um crédito de trial de US$ 5 por 30 dias e limites por serviço; a conta existente não pôde ser consultada, portanto saldo e limites restantes são desconhecidos. Nenhuma compra ou upgrade foi feito.

## Auditoria de dependências

- Frontend: `npm audit` reporta zero vulnerabilidades após atualizações compatíveis no lockfile.
- Backend: restam duas ocorrências moderadas do advisory `GHSA-g3hv-75wg-m249` para `minimatch`, introduzidas por `nodemon` (dependência direta apenas de desenvolvimento). `npm audit fix` indicou que a correção disponível exige sair da faixa de versão declarada; não foi aplicado `--force`. A árvore de produção (`npm ls --omit=dev`) não inclui `nodemon`/`minimatch`, portanto esse caminho não é carregado no serviço backend de produção. Evite padrões de glob não confiáveis na configuração local do nodemon até atualizar sua dependência.

## Qualidade e desempenho

- O build Vite passa, mas emite aviso porque o bundle principal ultrapassa 500 kB após minificação. O bundle principal gerado nesta validação ficou em aproximadamente 503 kB; revisar divisão de código antes de tráfego elevado.
- A integração com a Meta não foi exercitada; o E2E usa o provedor mock, conforme solicitado.
- O rate limiter guarda estado em memória. Em produção, manter uma instância do backend ou integrar um store compartilhado antes de escalar horizontalmente.
