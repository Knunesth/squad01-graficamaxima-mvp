# Prompt para o Windsurf — frontend e dashboard

Cole o bloco abaixo no Windsurf (Cascade), com a pasta do repositório aberta.

```text
Você vai trabalhar no frontend do sistema Gráfica Máxima, um sistema interno de orçamentos para uma gráfica de Brasília. Quem usa são atendentes de balcão e a dona da gráfica, em computador e às vezes no celular. Eles precisam montar orçamentos rápido, com o cliente esperando, e a dona precisa bater o olho no dashboard e entender como o mês está indo. Priorize clareza e velocidade de uso sobre efeito visual.

## Onde fica cada coisa

- Frontend: `Grafica-Maxima-FrontEnd/` (React 19, Vite, React Router 7, TanStack Query 5, React Hook Form, lucide-react para ícones). JavaScript puro, sem TypeScript.
- Backend: `Grafica-Maxima-Backend/` (Express 5 + PostgreSQL). Só mexa nele nos pontos em que este prompt pedir.
- Organização do frontend: `src/features/<área>/{pages,components,hooks}`, componentes compartilhados em `src/shared/components/{ui,layout,domain}`, formatação em `src/shared/utils/format.js`.
- Estilos: CSS puro em `src/shared/styles/`. Os tokens de cor, espaço e raio estão em `tokens.css` (`--brand-primary`, `--brand-ink`, `--brand-cyan`, `--brand-magenta`, `--brand-yellow`, `--space-*`, `--radius*`). Os arquivos são importados em ordem em `global.css`; `experience.css` é o último e é onde ficam os estilos mais recentes. Escreva estilo novo ali, usando os tokens. Não crie cores soltas nem adicione biblioteca de componentes ou de gráficos.
- Testes do frontend: `Grafica-Maxima-FrontEnd/tests/` (Vitest + Testing Library). `tests/helpers/render.jsx` monta os provedores.

Antes de alterar qualquer tela, leia `RELATORIO_SISTEMA.md` na raiz (visão geral e pendências) e os componentes que já existem em `src/shared/components/ui` (Button, InputField, NumericInput, Modal, Table, Toast, Feedback) e `domain` (StatusBadge, StatusSelect). Reaproveite-os em vez de criar parecidos.

## Padrões que já existem e devem ser mantidos

- Toda ação de salvar, excluir ou mudar status termina com um aviso: `const toast = useToast()` de `@/shared/hooks/useToast.js`, com `toast.success(...)` ou `toast.error(mensagemErro(erro))`. Erro de carregamento de tela continua em `<Feedback error=... />`.
- Campos de quantidade e de dinheiro usam `NumericInput` (padrão brasileiro, não aceita negativo). Não use `<input type="number">`.
- Botões têm ícone do lucide-react à esquerda do texto e ficam agrupados em `.form-actions`, `.row-actions` ou `.toolbar`, que já cuidam do espaçamento.
- Textos em português do Brasil, frases curtas, sem caixa alta em rótulos. O nome de uma ação é o mesmo no botão e no aviso ("Salvar orçamento" → "Orçamento #12 criado.").
- Acessibilidade: todo campo com rótulo, botão só de ícone com `aria-label`, foco visível, alvo de toque de 44 px, funcionar a 375 px de largura sem rolagem horizontal da página.
- Datas vêm da API como data-hora ISO; exiba com `dataBR` e use `dataISO` para preencher `<input type="date">`. Valores com `moeda`, `decimal` e `inteiro`.

## Tarefa 1 — Dashboard (a mais importante)

Arquivos: `src/features/dashboard/` e, no backend, `src/controllers/DashBoardController.js`.

Hoje o dashboard tem três cartões com mini-gráficos semanais, uma faixa com contagem por status e a tabela "Últimos orçamentos". O `GET /api/dashboard?mes=AAAA-MM` devolve: `ativos`, `valorAtivo`, `novos`, `valorNovos`, `aprovados`, `valorAprovados`, `semanas[]` (`semana`, `novos`, `aprovados`, `ativos`, `valor`), `statusCounts` (por status: `count`, `valor`), `recentes` (4 últimos) e `orcamentosPeriodo` (até 50 do mês, hoje sem uso na tela).

O que a dona da gráfica precisa responder ao abrir a tela, nesta ordem:
1. Quanto dinheiro está em aberto e quanto já foi fechado neste mês?
2. O mês está melhor ou pior que o anterior?
3. Quais orçamentos precisam de atenção agora (vencendo ou parados)?

Reorganize a tela para responder a isso:

- Linha de indicadores com quatro números: valor em aberto, valor aprovado no mês, vendas finalizadas no mês (quantidade e valor) e taxa de aprovação. Cada um com a comparação com o mês anterior (seta e percentual; sem base de comparação, não mostre nada em vez de "0%").
- Um gráfico principal, maior, com a evolução do mês: valor orçado e valor aprovado por semana, lado a lado. Faça em SVG, como o atual, com eixo e rótulos formatados em reais. Deve ter texto alternativo descrevendo os valores.
- Faixa por status: mantenha, mas cada item vira um link para `/orcamentos` já filtrado por aquele status (a lista precisa ler o status inicial da URL, por exemplo `?status=Aprovado`).
- Bloco "Precisam de atenção": orçamentos em aberto com validade vencida ou vencendo em até 3 dias, e orçamentos "Em negociação" há mais de 7 dias. Lista curta com link para o detalhe. Sem itens, mostre uma frase dizendo que está tudo em dia.
- Tabela "Últimos orçamentos": mantenha, com `StatusBadge`.
- Seletor de período: troque o popover atual por setas de mês anterior/próximo ao lado do nome do mês, mais o botão "Este mês".
- Estado vazio (mês sem orçamentos): em vez de gráficos zerados, uma mensagem e o botão "Novo orçamento".

Para isso o backend precisa devolver também: os mesmos totais do mês anterior, o valor e a quantidade finalizados no mês (por `data_finalizacao`) e a lista "precisam de atenção". Faça essas mudanças em `DashBoardController.js` com consultas parametrizadas, mantendo os campos atuais (há testes e telas que dependem deles). O cálculo do mês e das semanas deve usar o fuso `America/Sao_Paulo`, não UTC nem o fuso do servidor. Cubra os campos novos em `Grafica-Maxima-Backend/tests/integration/operacao.test.js`.

## Tarefa 2 — Ajustes no restante do frontend

1. Calculadora de m² (`src/features/calculator/CalculatorM2.jsx` e `calculator.css`): ainda usa estilos inline com cores fixas e emojis no texto. Reescreva o visual com as classes e tokens do sistema, usando `Modal`, `NumericInput` e `Button`. Não mude o comportamento: fora de um orçamento ela simula; em `/orcamentos/:id/editar` e `/status-orcamento/:id` ela grava o item no orçamento.
2. Confirmações: substitua os `window.confirm` (excluir cliente, excluir orçamento, remover material, reenviar relatório) por uma confirmação em `Modal`, com o nome do item no texto e o botão de confirmar nomeando a ação ("Excluir cliente").
3. Tela Usuários (`src/features/users/pages/UsersPage.jsx`): aplicar os mesmos padrões das outras telas (ícones, `.row-actions`, avisos com `useToast`, `StatusBadge` ou equivalente para ativo/inativo).
4. Tela Relatórios (`src/features/reports/`): alinhar botões, avisos e espaçamento ao padrão; não alterar regras de envio.
5. Lista de clientes: paginar no cliente (20 por página) quando houver mais de 20.
6. Remover código morto: `src/modules/legacy/` inteiro, `src/shared/utils/errorHandler.js` e o reexport `src/shared/services/format.js` (ajuste os imports e os testes que os citam).
7. Tamanho do pacote: o arquivo principal passa de 500 kB. Carregue sob demanda (`React.lazy`) as páginas de Relatórios, Papel, Usuários e Configurações.
8. Tela de orçamento (`NewBudgetPage.jsx`): ao escolher um material, o valor sugerido hoje é `custo_unitario + lucro_unitario`. Mostre abaixo do campo o valor de catálogo como referência e destaque, sem bloquear, quando o valor digitado ficar abaixo do custo.

## Regras

- Faça uma tarefa por vez e, ao fim de cada uma, rode dentro de `Grafica-Maxima-FrontEnd`: `npm run lint`, `npm test` e `npm run build`. Os três precisam passar. Se mexer no backend, rode `npm test` em `Grafica-Maxima-Backend`.
- Ao mudar o comportamento de uma tela, atualize ou acrescente testes em `tests/`. Não apague um teste para fazê-lo passar; se o teste estiver errado diante do novo comportamento, explique por quê.
- Não altere autenticação, permissões, rotas da API existentes, migrations nem os arquivos de deploy (`netlify.toml`, `railway.json`, `vercel.json`).
- Não adicione dependências sem perguntar antes.
- Não faça commit nem push; deixe as alterações para revisão.

## Entrega

Ao terminar, liste: o que mudou em cada tarefa, os arquivos tocados, o resultado dos três comandos e qualquer ponto que ficou pendente ou que precisa de decisão minha. Se alguma instrução deste prompt conflitar com o que você encontrar no código, pare e pergunte em vez de escolher sozinho.
```
