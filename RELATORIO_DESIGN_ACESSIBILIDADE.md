# Fase 0C — Design, responsividade e acessibilidade

## Resumo

A interface mantém o logotipo, a fonte Inter local, a paleta índigo da Gráfica Máxima e os acentos magenta e amarelo. O trabalho concentrou-se em tokens reutilizáveis, navegação móvel, áreas de rolagem, formulários, foco visível, títulos semânticos, mensagens para leitores de tela e apresentação responsiva. Não foram alteradas rotas da API, regras de negócio ou o layout do PDF de orçamento.

Também foi corrigida a renderização da tela de relatórios quando as datas chegam em formato ISO com horário; antes, a concatenação de uma segunda hora gerava `Invalid time value` e a tela ficava vazia.

## Mudanças por tela

As capturas foram feitas com seed de demonstração em schema PostgreSQL temporário. As dimensões completas são 320×568, 390×844, 768×1024, 1024×768, 1440×900 e 1920×1080. A pasta contém 54 capturas “antes” (três dimensões) e 108 “depois” (seis dimensões), além dos resumos de QA.

| Tela ou estado | Antes (390×844 ou desktop) | Depois (390×844 ou desktop) |
|---|---|---|
| Login | [390×844](qa-evidence/design/antes/login__390x844.png) | [390×844](qa-evidence/design/depois/login__390x844.png) |
| Cadastro | [390×844](qa-evidence/design/antes/cadastro__390x844.png) | [390×844](qa-evidence/design/depois/cadastro__390x844.png) |
| Dashboard | [1440×900](qa-evidence/design/antes/dashboard__1440x900.png) | [1440×900](qa-evidence/design/depois/dashboard__1440x900.png) |
| Lista de orçamentos | [390×844](qa-evidence/design/antes/orcamentos__390x844.png) | [390×844](qa-evidence/design/depois/orcamentos__390x844.png) |
| Orçamentos sem resultados | [390×844](qa-evidence/design/antes/orcamentos-vazio__390x844.png) | [390×844](qa-evidence/design/depois/orcamentos-vazio__390x844.png) |
| Escolha para novo orçamento | [390×844](qa-evidence/design/antes/novo-orcamento__390x844.png) | [390×844](qa-evidence/design/depois/novo-orcamento__390x844.png) |
| Localizar cliente para orçamento | [390×844](qa-evidence/design/antes/buscar-cliente-orcamento__390x844.png) | [390×844](qa-evidence/design/depois/buscar-cliente-orcamento__390x844.png) |
| Cadastro de cliente no fluxo de orçamento | [390×844](qa-evidence/design/antes/novo-cliente-orcamento__390x844.png) | [390×844](qa-evidence/design/depois/novo-cliente-orcamento__390x844.png) |
| Montagem do orçamento | [390×844](qa-evidence/design/antes/montar-orcamento__390x844.png) | [390×844](qa-evidence/design/depois/montar-orcamento__390x844.png) |
| Edição de orçamento | [390×844](qa-evidence/design/antes/editar-orcamento__390x844.png) | [390×844](qa-evidence/design/depois/editar-orcamento__390x844.png) |
| Detalhe do orçamento | [390×844](qa-evidence/design/antes/detalhe-orcamento__390x844.png) | [390×844](qa-evidence/design/depois/detalhe-orcamento__390x844.png) |
| Clientes | [390×844](qa-evidence/design/antes/clientes__390x844.png) | [390×844](qa-evidence/design/depois/clientes__390x844.png) |
| Catálogo | [390×844](qa-evidence/design/antes/catalogo__390x844.png) | [390×844](qa-evidence/design/depois/catalogo__390x844.png) |
| Configurações | [390×844](qa-evidence/design/antes/configuracoes__390x844.png) | [390×844](qa-evidence/design/depois/configuracoes__390x844.png) |
| Relatórios | [390×844](qa-evidence/design/antes/relatorios__390x844.png) | [390×844](qa-evidence/design/depois/relatorios__390x844.png) |
| Usuários | [390×844](qa-evidence/design/antes/usuarios__390x844.png) | [390×844](qa-evidence/design/depois/usuarios__390x844.png) |
| Calculadora aberta | [390×844](qa-evidence/design/antes/calculadora-aberta__390x844.png) | [390×844](qa-evidence/design/depois/calculadora-aberta__390x844.png) |
| Edição de material (modal) | [390×844](qa-evidence/design/antes/modal-material__390x844.png) | [390×844](qa-evidence/design/depois/modal-material__390x844.png) |

O menu lateral passou a ser recolhível em telas pequenas; tabelas e planilhas mantêm a rolagem dentro do componente e podem receber foco pelo teclado. Formulários de cliente ganharam teclados/autopreenchimento apropriados para telefone, e-mail e CPF/CNPJ. A calculadora agora usa `<dialog>` nativo, com Escape, confinamento de foco do navegador e retorno ao acionador. Os gráficos de receita têm uma tabela textual equivalente.

## Tokens e componentes

Em `Grafica-Maxima-FrontEnd/src/shared/styles/tokens.css` foram organizados tokens para cores de marca e estados (sucesso, aviso, erro, informação e desabilitado), texto/superfície/borda, escala de espaçamento, tamanhos tipográficos, raios, sombras, foco e camadas z-index. As cores ciano e magenta usadas para texto foram escurecidas para contraste adequado; as cores principais da marca permanecem.

Os componentes compartilhados agora incluem: botão com estados disabled/loading/`aria-busy` e variante de perigo; campos que associam erro por `aria-describedby` e `aria-invalid`; tabelas com caption acessível, região rolável focável e estado de carregamento; badges de status textuais; e modais nativos. O CSS comum inclui foco visível, alvos de toque de 44 px, `prefers-reduced-motion`, áreas seguras de dispositivos móveis, altura `100dvh` e estilos de impressão sem navegação/ações.

Contraste calculado pela fórmula WCAG para os pares de tokens usados em texto sobre branco: primário `#4541a2` 8,30:1; ciano `#007da7` 4,68:1; magenta `#b5186c` 6,34:1; texto secundário `#51566e` 7,23:1; erro `#a51d3d` 7,39:1. O axe também verificou contraste nos estados capturados.

## Resultados de acessibilidade

O axe foi executado em Chromium. A versão anterior foi avaliada em 18 estados na largura 390 px: 18 violações no total — 2 críticas e 16 sérias. As categorias encontradas foram contraste (14), rótulo ausente (1), nome de select ausente (1) e região rolável sem foco de teclado (2). O resumo está em [axe-baseline-390.json](qa-evidence/design/antes/axe-baseline-390.json).

Depois, o axe avaliou 108 combinações de tela/estado e largura: **0 violações críticas, sérias, moderadas ou menores**. Não houve overflow horizontal entre 320 e 1920 px. Os resultados e seletores avaliados estão em [qa-summary.json](qa-evidence/design/depois/qa-summary.json).

Foram automatizados sete fluxos por teclado: login; criar cliente; localizar o cliente e criar orçamento; mudar o status; gerar relatório; enviar relatório no modo mock; e abrir/fechar o menu móvel e a calculadora com Escape e retorno de foco.

## Lighthouse — antes e depois

Valores reais de Lighthouse em servidor Vite de desenvolvimento. A ordem das notas é desempenho/acessibilidade/melhores práticas.

| Tela e dispositivo | Antes | Depois |
|---|---:|---:|
| Login, celular | 52 / 98 / 96 | 52 / 100 / 96 |
| Dashboard, celular | 53 / 98 / 96 | 53 / 100 / 96 |
| Login, desktop | 44 / 98 / 96 | 44 / 100 / 96 |
| Dashboard, desktop | 44 / 98 / 96 | 43 / 100 / 96 |

FCP ficou em aproximadamente 640–644 ms e CLS entre 0,0001 e 0,0003. O Lighthouse registrou LCP entre 73,5 e 74,1 segundos, apesar do FCP e Speed Index abaixo de 1,8 s; essa medição é atípica e o score de desempenho baixo no servidor de desenvolvimento não foi tratado como medição de produção. Repetir Lighthouse no build/host de produção antes de usar esse score para uma decisão de desempenho. O alvo de acessibilidade foi superado (100 nas quatro medições posteriores).

## Itens pendentes e limites dos testes

- Não testado com NVDA, VoiceOver ou outro leitor de tela real, nem em aparelhos físicos ou Safari.
- Zoom de 200% e espaçamento de texto customizado não foram simulados diretamente; os testes de viewport cobrem reflow até 320 px.
- A interface recebe evento de sessão expirada, mas não tem sinal antecipado de expiração para exibir aviso antes da perda da sessão.
- A medição LCP do Lighthouse em Vite dev é anômala; precisa de repetição em ambiente de produção.
- O axe não prova todas as combinações de dados/conteúdo possíveis; mudanças futuras em texto, cores ou estados exigem nova rodada.

## Checklist manual

- [ ] Percorrer cada rota só com Tab, Shift+Tab, Enter e Escape; confirmar foco visível e link “Pular para o conteúdo”.
- [ ] Abrir o menu móvel e os modais; confirmar que o foco permanece no modal e retorna ao controle de abertura ao fechar.
- [ ] Aumentar o zoom para 200% e conferir formulários, tabelas, gráficos e relatórios sem perda de conteúdo.
- [ ] Ler status e valores sem depender apenas de cor e confirmar a tabela textual do gráfico.
- [ ] Conferir o resumo impresso de relatório em preto e branco e a quebra das seções.

## Reuso do QA

O script [qa-a11y.js](Grafica-Maxima-FrontEnd/scripts/qa-a11y.js) não contém segredos. Ele aceita somente `DATABASE_URL` em loopback, cria um schema aleatório, roda migrations e seed fictício, sobe API/Vite localmente, executa axe/Lighthouse/teclado, grava screenshots e remove o schema ao encerrar. Para reproduzir no PowerShell:

```powershell
cd Grafica-Maxima-FrontEnd
$line = Get-Content ..\Grafica-Maxima-Backend\.env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$env:DESIGN_QA_DATABASE_URL = $line.Substring('DATABASE_URL='.Length)
$env:DESIGN_QA_ADMIN_PASSWORD = 'Senha-Ficticia-Admin-Para-QA-2026!'
$env:DESIGN_QA_ATTENDANT_PASSWORD = 'Senha-Ficticia-Atendente-Para-QA-2026!'
npx playwright install chromium
node scripts/qa-a11y.js depois
```

As duas senhas são apenas exemplos fictícios para a base temporária e devem ser diferentes de credenciais de qualquer ambiente persistente.
