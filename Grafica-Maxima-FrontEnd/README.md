# Gráfica Máxima — Frontend

Aplicação React + Vite baseada nas oito telas do [wireframe no Figma](https://www.figma.com/design/far5kRy6xeGPgIbhIMmnTB/?node-id=9-15). Usa React Router, TanStack Query e React Hook Form com Zod.

## Executar

```sh
npm install
npm run dev
```

A API padrão é `http://localhost:3301`. Configure `VITE_API_URL` em `.env.local` para usar outro endereço. A autenticação usa a sessão do backend; não há dados fictícios embutidos na aplicação.

```sh
npm run lint
npm run build
```

## Organização

```text
src/
  app/                 # Rotas, providers, sessão e cache
  components/
    layout/            # Estrutura, navegação e cabeçalhos
    ui/                # Botão, campo, tabela, feedback e spinner
    domain/            # Componentes compartilhados do domínio
  features/
    auth/              # Login e cadastro
    dashboard/         # Indicadores, gráficos e últimos orçamentos
    orcamentos/        # Clientes, produção, listagem e detalhes
    catalogo/          # Papéis, acabamentos e edição de materiais
    configuracoes/
    usuarios/
    calculadora/
  hooks/               # Consultas e mutations da API
  services/            # Comunicação HTTP e contexto da sessão
  lib/                 # Formatação e utilitários
  styles/              # Tokens, estilos globais e layout
  legacy/              # Código anterior preservado, fora das rotas e do CSS ativo
```

Novas telas ficam na funcionalidade correspondente em `features/`; componentes compartilhados ficam em `components/`. Valores e datas são formatados em `lib/format.js`.

`main.jsx` importa a fonte Inter local e o único ponto de entrada de CSS, `styles/global.css`. `tokens.css` centraliza cores e tipografia; `screens.css` contém os estilos das telas; `wireframe.css` reúne os ajustes de geometria e responsividade. O CSS antigo de `legacy/` não é importado, evitando interferência em formulários e tabelas.

## Correspondência com o Figma

| Tela | Rota |
| --- | --- |
| Cadastro | `/cadastro` |
| Dashboard | `/` |
| Selecionar cliente | `/orcamentos/novo` |
| Cliente cadastrado | `/orcamentos/novo/cliente` |
| Novo cliente | `/orcamentos/novo/cadastro` |
| Custo de produção | `/orcamentos/novo/producao` |
| Orçamentos realizados | `/orcamentos` |
| Papel | `/papel` |

O desktop tem menu de 220 px, conteúdo com recuo de 40 px e cards do dashboard de 364 × 310 px na largura de referência de 1440 px. Em telas menores, as grades viram uma coluna e as tabelas têm rolagem horizontal interna.

Valores, semanas e registros vêm da API. Os gráficos são dinâmicos, e o espaço reservado para o logo segue o protótipo. Configurações, usuários, calculadora, validação e link de login permanecem disponíveis como funções adicionais. O campo de data da produção continua identificado como **Validade do orçamento**, conforme o contrato da API; no Figma ele é chamado de “Data do orçamento”. O ID da listagem abre os detalhes, onde a edição continua disponível.

As capturas de conferência ficam em `../tmp/visual-review/`. A verificação de interface usa respostas simuladas da API e não comprova a integração com um banco real. A série semanal de valores ativos depende do backend: o controlador atual inicializa `semanas[].ativos` com zero sem preencher esses valores; a evolução real exige uma definição dessa regra no backend.
