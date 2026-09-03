# Change: substituir Details por um painel de ferramentas com abas

## Why

O painel atual mistura widgets empilhados, a alternância Details/Files e painéis separados para Plan, Terminal, Changes e arquivos. O usuário quer escolher uma funcionalidade e abri-la em uma aba no mesmo painel lateral, como nas referências fornecidas.

## What Changes

- Substituir a interface Details/Files e Edit widgets por um painel lateral com abas fecháveis.
- Ao abrir o painel sem abas, mostrar as opções Workspace, To-dos, Plan, Terminal, Changes e Files. Depois da primeira aba, o botão `+` oferece as mesmas opções em um dropdown sem substituir o conteúdo atual. Manter os nomes em inglês para acompanhar a interface atual.
- Ao escolher uma opção, abrir seu conteúdo no espaço do painel. O botão `+` abre o dropdown de ferramentas sem fechar ou ocultar as abas existentes.
- Reutilizar a aba das ferramentas únicas; permitir várias abas de arquivos, uma por caminho. Cada escolha de Terminal pelo seletor cria uma aba independente, numerada e com sessões próprias. Atalhos reativam o último terminal usado.
- Persistir a posição por aba de Terminal, permitindo manter terminais diferentes simultaneamente na sidebar e no painel inferior.
- Reaproveitar o padrão visual das abas dos chats, mantendo o estado de ferramentas separado do estado das conversas.
- Direcionar os acessos laterais existentes de terminal, plano, diff e arquivos para o novo painel, sem abrir uma segunda sidebar concorrente.
- Preservar ações existentes: aprovar plano, revisar alterações, selecionar arquivos para commit, commit/push, explorar arquivos e usar o terminal.
- Remover MCP Servers do seletor e do painel. A configuração e o funcionamento de MCP em Settings permanecem intactos.
- Preservar sessões de terminal ao alternar abas ou recolher o painel, e manter abas por workspace e janela do aplicativo.

## Scope

"Janelas" significa abas internas no painel direito, conforme as imagens; não novas janelas do sistema operacional. As abas de chat existentes permanecem onde estão. Esta mudança não adiciona Browser ou chat lateral, pois o pedido trata de reorganizar as funcionalidades atuais do Details.

Apresentações existentes fora da sidebar, como diff em diálogo/tela cheia e terminal inferior, permanecem disponíveis. Apenas a apresentação lateral passa a usar o novo painel, sem renderizar a mesma sessão em dois lugares.

## Impact

- Affected specs: `tool-panel` (nova especificação; o repositório não contém especificações anteriores).
- Affected code: `features/details-sidebar`, integração em `features/agents/main/active-chat.tsx`, ações em `features/agents/ui/sub-chat-selector.tsx`, visualização de arquivos, terminal e registro de atalhos.
- Sem alterações no banco, nos provedores de IA ou no backend de MCP.
- Preferências antigas de visibilidade/ordem de widgets deixam de controlar a interface. Largura e estado aberto/fechado do painel são preservados.

## Approval

Proposta aprovada pelo usuário com “pode fazer”. Implementação autorizada conforme `openspec/AGENTS.md`.
