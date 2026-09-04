## Verification

### Automated

- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 43 testes passaram em 9 arquivos (1 novo: agregação de `hasMore` com todos esgotados vs. algum com mais páginas).
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: mesma contagem de diagnósticos do baseline (201), nenhum novo apontando para os arquivos alterados.

### Manual validation against the real repository

Antes de implementar, testado via `gh api graphql` direto:
- `search(query: "repo:juliuscaezarff/instructor is:pr sort:updated-desc", type: ISSUE, first: 3)` → página 1 retornou PRs #10, #9, #8, com `hasNextPage: true` e um `endCursor`.
- A mesma query com `cursor` do resultado anterior → página 2 retornou #7, #6, #5 — sem sobreposição, sem lacunas.
- Repetido com a query de produção completa (incluindo a sub-seleção de `statusCheckRollup` via `commits(last:1)`) — mesmo resultado, confirmando que a paginação funciona com o payload real usado pelo código.

### Implemented flow

- Cada repositório configurado continua sendo buscado com sua própria chamada em paralelo (isolamento de falha preservado); só o comando por trás mudou de `gh pr list` para `gh api graphql` com `search`.
- Cache por repositório agora guarda `hasNextPage`/`endCursor` além dos itens já carregados.
- Botão "Load more" no fim da lista agregada, visível só quando `hasMore` é verdadeiro (algum repositório ainda tem próxima página); busca a próxima página só de quem ainda tem, acrescenta e deduplica por chave (`owner/repo#number`).
- Falha ao carregar mais preserva a lista já carregada e mostra mensagem de erro com o botão continuando disponível pra nova tentativa.
- Nenhuma alteração no comportamento de ordenação/filtro existente — `sort:updated-desc` fixo, igual ao critério já usado hoje.

### Pending manual QA

Este ambiente não tem acesso a uma janela Electron interativa. Falta validar visualmente:

1. Clicar em "Load more" na central de verdade e confirmar que a lista cresce sem duplicar nem perder itens já visíveis.
2. Testar falha de rede durante "Load more" (ex.: desconectar) e confirmar que a lista anterior permanece intacta com a mensagem de erro.
3. Confirmar que o botão desaparece quando não há mais páginas.
4. Navegação por teclado até o botão e leitura do estado por leitor de tela.

Nenhum commit ou PR foi criado nesta implementação.
