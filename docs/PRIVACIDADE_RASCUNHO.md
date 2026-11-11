# Aviso de privacidade — rascunho para revisão

> **RASCUNHO. Este texto não é um aviso final nem aconselhamento jurídico. A proprietária/administradora deve revisar os dados e operações reais com profissional de privacidade/jurídico antes de publicá-lo ou usar o sistema em produção.**

## Quem opera o sistema

A Gráfica Máxima, por meio da pessoa responsável pela operação e dos administradores do sistema, recebe e utiliza os dados descritos abaixo para administrar clientes, produzir orçamentos e prestar os serviços da gráfica. Os papéis legais e os canais para exercício de direitos ainda precisam ser confirmados e preenchidos pela organização.

## Dados que o sistema pode guardar

- **Clientes:** nome de pessoa ou empresa, CPF/CNPJ, telefone, e-mail, endereço e data do cadastro.
- **Usuários internos:** nome, login, e-mail, perfil, estado de acesso, data de criação e hash de senha. A senha em texto aberto não deve ser armazenada.
- **Orçamentos e pedidos:** vínculo com cliente e atendente, datas de criação, validade e finalização, status, prazo, quantidades, valores, descontos e observações.
- **Itens do orçamento:** descrição do produto, dimensões, quantidades, materiais escolhidos, valores calculados e snapshots de preços usados.
- **Histórico operacional:** usuário que fez alterações, entidade, campo alterado, valores anterior e novo, descrição e data/hora. Valores livres podem conter dados pessoais se forem inseridos em observações ou descrições.
- **Relatórios e WhatsApp:** nome e telefone dos destinatários configurados, período e indicadores agregados do relatório, tentativas, status, identificador de mensagem do provedor e erro operacional. O provedor WhatsApp recebe o telefone de destino e o conteúdo do template quando a integração real é habilitada. O modo atual de desenvolvimento é `mock` e não entrega mensagens pela Meta.
- **Segurança da sessão:** token de sessão em cookie `HttpOnly` no navegador. O servidor mantém a versão da sessão junto ao usuário para invalidar sessões após alteração de senha; não guarda o token JWT no banco. O limitador de login mantém temporariamente contadores por endereço IP na memória do processo.

## Finalidades

Os dados são usados para identificar clientes, responder solicitações, elaborar e acompanhar orçamentos, calcular preços, organizar produção e entrega, administrar contas internas, gerar relatórios de negócio, enviar relatórios a destinatários escolhidos pela administração e proteger o acesso contra tentativas automatizadas. A equipe deve confirmar a necessidade de cada campo e não coletar dados que não sejam necessários ao serviço.

## Compartilhamento e armazenamento

O banco PostgreSQL guarda registros necessários à operação. Quando habilitado, o serviço de WhatsApp/Meta recebe números e mensagens para fazer a entrega. A hospedagem, banco gerenciado, armazenamento de backup e monitoramento externo também podem processar dados técnicos ou de operação conforme os fornecedores escolhidos. A lista final de fornecedores, regiões e contratos ainda deve ser preenchida após a implantação.

## Retenção e exclusão

**A aplicação não implementa prazo automático de retenção nem exclusão programada.** Orçamentos, clientes, usuários, histórico e registros de envio permanecem no banco até ação administrativa ou política operacional externa. Backups podem conter cópias dos mesmos dados; sua retenção depende do destino e da rotina de backup. A organização deve definir e documentar prazos por categoria, considerando obrigações contratuais, fiscais e legais aplicáveis, além de testar a remoção também nos backups quando estes expirarem.

## Segurança e cuidados

O sistema usa senhas derivadas com scrypt, cookies de sessão `HttpOnly`, controle de perfil, limite de tentativas de login, parâmetros SQL e conexão PostgreSQL com TLS quando configurada. Essas medidas reduzem riscos, mas não eliminam todos os incidentes. Restringir acesso às contas administrativas, proteger variáveis de ambiente e backups, remover acessos quando alguém deixar a equipe e não registrar dados pessoais em observações desnecessárias.

## Direitos e contato

O canal de contato, o responsável pelo atendimento e o procedimento para solicitações de acesso, correção, informação, oposição ou exclusão ainda precisam ser definidos pela organização e revisados por profissional qualificado. Não publique este rascunho até substituir os campos pendentes e confirmar se o texto descreve as práticas reais.
