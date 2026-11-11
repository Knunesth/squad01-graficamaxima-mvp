# Guia de uso — Gráfica Máxima

Este guia descreve os fluxos que existem hoje na aplicação. O sistema é uma área interna de trabalho: clientes finais não entram nem têm conta.

## Acesso e perfis

Abra o endereço fornecido pela equipe e entre com login e senha. No primeiro uso, o administrador inicial é criado pelo processo de implantação; não compartilhe essa conta. Uma pessoa sem conta pode usar **Criar conta** na tela de acesso. O cadastro novo fica inativo até o administrador liberar em **Usuários**. Se a conta não estiver liberada, o login será recusado.

Atendente e administrador podem consultar o dashboard, clientes, orçamentos, catálogo e configurações. A tela **Relatórios** e a administração de **Usuários** aparecem apenas para administradores. O administrador também é o único perfil que altera catálogo, usuários, destinatários e preços por m². Atendentes podem consultar o catálogo, simular cálculos e criar orçamentos.

## Fluxos mais usados

### Criar um orçamento

1. Na navegação lateral, abra **Novo orçamento**.
2. Escolha continuar sem cliente, localizar um cliente existente (por e-mail e CPF/CNPJ) ou cadastrar um cliente.
3. Informe os dados do produto e os itens: materiais, quantidades, dimensões e opções disponíveis. Use o botão **m²** para abrir a calculadora; dentro de um orçamento, o resultado pode ser vinculado ao orçamento.
4. Revise valores, desconto e validade e salve.
5. Abra o orçamento na lista para conferir os itens, baixar o PDF ou editar os dados.

Cliente é opcional. Cadastre somente os dados necessários para identificar e atender o pedido.

### Acompanhar e atualizar orçamentos

Em **Orçamentos**, use a busca por ID, nome ou e-mail e filtre por status. Abra o número para ver os detalhes. O controle de aprovação alterna entre **Aprovado** e **Não aprovado**; o status **Inativo** permanece visível na lista. A tela de detalhe oferece edição, PDF e, conforme o estado, exclusão. Os relatórios contam como venda somente o status **Finalizado**, mas a interface atual não apresenta uma ação para marcar um orçamento como Finalizado. Esse passo ainda precisa de uma tela/ação antes de o fluxo operacional de fechamento ficar completo.

### Cadastrar clientes

Em **Clientes**, escolha novo cadastro, preencha nome e os dados de contato/documento disponíveis e salve. Para alterar um cadastro, use **Editar** na linha correspondente. A exclusão pede confirmação e pode ser recusada quando o cliente estiver ligado a outros dados.

### Consultar ou manter o catálogo

Abra **Papel** para consultar materiais agrupados por categoria. O administrador pode editar os valores e margens da categoria ou de um material, cadastrar novos materiais e desativá-los. Materiais desativados deixam de aparecer como opções novas; os orçamentos anteriores preservam seus valores.

Em **Configurações**, o administrador ajusta os preços base por m². O cálculo mostra o valor estimado conforme tipo de serviço, largura, altura e quantidade. A configuração de destinatários e o histórico de WhatsApp ficam na área de **Relatórios**.

### Consultar relatórios e WhatsApp (administrador)

1. Abra **Relatórios**, selecione relatório semanal ou mensal e a data de referência.
2. Use **Gerar/atualizar** para calcular o período e confira os indicadores e o histórico.
3. Na seção **Destinatários e envios**, cadastre números no formato internacional `+` seguido do código do país e número. O limite atual é informado pela própria tela.
4. Use o envio manual quando necessário. Se já houver envio confirmado ao mesmo número para aquele relatório, a interface pede confirmação antes de tentar novamente.
5. Consulte o histórico para verificar status, horário e modo. `mock` indica envio de teste, sem entrega real pela Meta.

Receita contabiliza somente orçamentos **Finalizados**, pela data de finalização. **Aprovado/em produção** é exibido separado. Indicadores de conversão e aprovação referem-se a orçamentos criados no período selecionado.

### Gerenciar usuários e senhas

Em **Usuários** (administrador), libere ou desative contas, ajuste o perfil e, quando necessário, redefina a senha de outra pessoa. A redefinição encerra as sessões anteriores dessa conta. Cada pessoa pode alterar a própria senha em **Configurações**, informando a senha atual e uma nova senha de pelo menos 12 caracteres; será necessário entrar novamente.

## Estados e ajuda

- Durante carregamento, aguarde o indicador da tela antes de repetir uma ação.
- Mensagens de validação aparecem junto ao formulário. Revise os campos apontados e tente novamente.
- Se houver erro de conexão, confirme a rede e tente novamente. Não repita uma ação financeira várias vezes sem conferir antes a lista ou o histórico.
- Ao encerrar, use **Sair** na navegação lateral. A sessão também expira após o prazo definido pelo sistema.

Se o problema persistir, informe à pessoa administradora a tela, a ação e o horário aproximado. Não envie senhas, tokens, CPF/CNPJ ou prints que contenham dados pessoais em canais abertos.
