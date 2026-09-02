## Context

`DetailsSidebar` renderiza widgets via `WIDGET_REGISTRY`, com visibilidade e ordem persistidas por workspace. Files é uma segunda visualização fixa. `active-chat.tsx` coordena sidebars independentes de plano, terminal, diff e arquivos, incluindo efeitos que fecham um painel quando outro abre.

`SubChatSelector` oferece o padrão visual de abas, mas seu store também controla chats, streaming e filas de mensagens. Compartilhar esse store com ferramentas misturaria responsabilidades. `TerminalSection` já gerencia múltiplas sessões e o componente Terminal se desconecta da sessão sem matar o processo ao desmontar.

## Goals / Non-Goals

- Goals: um painel direito com seleção de ferramenta, abas, fechamento individual e persistência por contexto; preservar os recursos existentes e seus dados.
- Non-goals: criar janelas Electron, implementar docking/arraste entre painéis, adicionar navegador, mover chats para o painel, remover suporte a MCP ou substituir as operações de Git/terminal.

## Interaction

1. Abrir o painel vazio pela primeira vez mostra uma lista centralizada de ferramentas, com ícone, nome e atalho existente quando disponível.
2. Selecionar uma ferramenta cria/ativa a aba correspondente e mostra seu conteúdo ocupando a área restante. Terminal é a exceção: cada escolha no seletor cria uma nova aba numerada com escopo de sessões próprio; ativar uma aba existente ou usar o atalho preserva a sessão.
3. O cabeçalho mostra abas com ícone, título e fechamento. O botão `+` fica logo após a última aba, acompanhando a rolagem da faixa; apenas o controle de recolher permanece fixo à direita.
4. Depois que existe uma aba, o `+` abre um dropdown ancorado ao botão e alinhado para o interior do painel, com margem mínima contra as bordas da janela. A aba e sua sessão permanecem visíveis. A lista centralizada só reaparece quando todas as abas são fechadas.
5. Fechar a aba ativa seleciona a vizinha; fechar a última mantém o painel aberto no seletor. Recolher o painel não fecha as abas.
6. Files abre a árvore com busca. Selecionar um arquivo abre uma aba de conteúdo; selecionar o mesmo caminho novamente ativa a aba existente.
7. Workspace e Changes seguem o workspace; Plan e To-dos seguem o subchat ativo. Ausência de plano/tarefas resulta em estado vazio explícito, sem fechar a aba.

## Architecture

- Criar um shell de painel e um estado dedicado às abas, próximos de `features/details-sidebar`, para substituir o container atual.
- Modelar abas de ferramenta com ID estável por tipo e abas de arquivo com ID por caminho normalizado segundo a plataforma. Guardar tipo, ID e caminho quando aplicável, sem persistir instâncias React, conteúdo de arquivo ou objetos de terminal.
- Persistir abas e aba ativa por janela e workspace usando `atomWithWindowStorage`, seguindo o isolamento já utilizado nas abas de chat. Validar dados carregados, remover duplicatas/tipos desconhecidos e recuperar seleção inválida.
- Centralizar ações como abrir ferramenta, abrir arquivo, ativar e fechar aba. Atalhos, menu inicial, links em mensagens e botões de revisão devem usar essas ações para a apresentação lateral.
- Reaproveitar InfoSection, conteúdo de To-dos/Plan, integração de Changes, árvore de Files e visualizadores existentes. Extrair conteúdo de wrappers de sidebar quando necessário para evitar cabeçalhos e controles duplicados.
- Usar um único container redimensionável. Retirar os efeitos de exclusão/restauração entre sidebars quando o destino for o novo painel.
- Montar conteúdos sob demanda. Manter estado das abas já visitadas ao alternar; conteúdos ocultos ficam fora da navegação e leitura assistiva. Terminal e Monaco recalculam dimensões ao reativar.
- Preservar o escopo legado de terminal e derivar um subescopo estável por ID para cada nova aba; não criar uma sessão nova ao simplesmente alternar ferramentas. Fechar a aba Terminal não equivale a matar suas sessões; encerrar uma sessão continua sendo a ação explícita existente.
- Guardar `side-peek` ou `bottom` em cada aba de terminal. O painel inferior deriva sua sessão de uma aba marcada como bottom; outra aba marcada como side-peek pode continuar montada simultaneamente na lateral. A troca de posição afeta somente a aba que originou a ação.
- Preservar apresentações de diálogo, tela cheia ou terminal inferior; ao mudar a apresentação, garantir uma única renderização ativa do conteúdo e retornar à mesma aba no modo lateral.
- Reutilizar os componentes, tokens, densidade e ícones já existentes. Não introduzir biblioteca de docking.

## Migration

- Manter `overview:sidebarOpen` e a largura persistida.
- Usar uma chave versionada nova para as abas. Na ausência de dados novos, iniciar no seletor; não transformar widgets antigos em abas abertas automaticamente.
- Ignorar a preferência legada Details/Files, visibilidade/ordem dos widgets e o flag que alternava sidebars legadas. Essas preferências não podem restaurar o modelo antigo.
- Eliminar MCP do registro do painel e filtrar qualquer tipo MCP legado, sem tocar em servidores configurados, credenciais ou Settings.
- Preservar dados de árvore expandida, cache de plano e terminais, pois pertencem às funcionalidades e não ao layout substituído.

## Accessibility and sizing

- Abas com `tablist`, `tab`, `tabpanel`, seleção anunciada e foco móvel por setas/Home/End. Enter/Space ativam; controles de fechamento têm nome acessível e não ficam aninhados em outro botão.
- Fechar a aba devolve o foco à aba vizinha ou ao seletor; recolher o painel devolve foco ao seu controle de abertura. Não capturar Escape globalmente enquanto um menu, diálogo ou terminal possui seu próprio tratamento.
- Seletor utilizável por teclado, foco visível e rótulos explícitos. Atalhos vêm do registro atual, sem copiar atalhos das imagens.
- Controles não disponíveis em contextos remotos ficam desabilitados com motivo visível. Não consultar arquivos nem iniciar terminal local para um workspace remoto sem caminho local.
- As abas comprimem seus títulos até uma largura mínima antes de a faixa criar rolagem horizontal. Verificar largura mínima, títulos longos, múltiplas abas e zoom de 200%, preservando a primeira aba e o acesso a `+`, fechar e recolher.

## Risks / Trade-offs

- Sessões duplicadas ou reiniciadas ao trocar de aba: usar IDs/escopos existentes e validar preservação do processo e do diretório atual.
- Efeitos antigos reabrirem painéis: migrar todos os pontos de entrada laterais e remover a exclusão mútua antiga nesse caminho.
- Contexto cruzado entre chats: chave por janela/workspace e derivação de plano/tarefas pelo subchat ativo.
- Abas de arquivos indisponíveis após reiniciar: mostrar erro recuperável e permitir fechar; não selecionar um arquivo diferente silenciosamente.
- Custo de manter painéis montados: montagem sob demanda, pausa de trabalho visual quando oculto e liberação ao fechar, sem encerrar processos de terminal implicitamente.

## Validation

Validar transições do estado de abas e isolamento de contexto. Na interface real, abrir várias ferramentas, navegar e fechar pelo teclado, reabrir o painel, trocar de workspace/subchat e confirmar sobrevivência do terminal. Conferir abertura de arquivos por árvore, busca, mensagens e terminal; revisão/commit; estados sem plano/tarefas; workspace remoto; modos expandidos existentes e restauração após reload. Rodar build e comparar diagnósticos de TypeScript com o baseline preexistente.
