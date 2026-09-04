## Verification

### Automated

- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 44 testes passaram em 9 arquivos (1 novo: mapeamento de cada critério ao qualificador `sort:` correto, com os 3 valores distintos entre si).
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: mesma contagem de diagnósticos do baseline (201), nenhum novo apontando para os arquivos alterados.

### Manual validation against the real repository

Já confirmado na investigação da proposta: `sort:created-desc` retornou o PR #10 primeiro (mais recente), `sort:created-asc` retornou o PR #1 primeiro (mais antigo), `sort:updated-desc` (padrão) manteve o comportamento já existente.

### Implemented flow

- Três critérios: **Recently updated** (padrão), **Newest**, **Oldest** — controle em dropdown na toolbar com grupo de rádio, mostrando o critério ativo.
- Preferência persistida localmente (`pull-requests:sort`), mesmo padrão dos filtros de estado/repositório já existentes.
- Trocar o critério reinicia a paginação do repositório no backend (cursor/itens acumulados descartados quando o `sort` em cache diverge do solicitado) e dispara um novo carregamento no frontend (o `sort` faz parte da chave da query tRPC).
- "Load more" após trocar de critério continua paginando corretamente sob o novo critério, já que o cache por repositório guarda qual `sort` gerou os itens acumulados.

### Pending manual QA

Este ambiente não tem acesso a uma janela Electron interativa. Falta validar visualmente:

1. Trocar o critério e confirmar a reordenação da lista na tela.
2. Carregar mais páginas, trocar de critério, e confirmar que a lista reinicia do zero com o novo critério (sem misturar itens de ordenações diferentes).
3. Navegação por teclado até o controle e leitura do critério ativo por leitor de tela.

Nenhum commit ou PR foi criado nesta implementação.
