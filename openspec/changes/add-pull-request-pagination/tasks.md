## 1. Backend e contrato

- [x] 1.1 Implementar busca de PRs por repositório via `gh api graphql` (`search`, `type: ISSUE`) com paginação por cursor, substituindo `gh pr list --json`.
- [x] 1.2 Estender o cache por repositório para guardar `hasNextPage`/`endCursor` além dos itens.
- [x] 1.3 Implementar acréscimo de página (`loadMore`) por repositório: busca só quem ainda tem `hasNextPage`, acrescenta e deduplica por chave.
- [x] 1.4 Adicionar `hasMore` ao resultado agregado (`PullRequestListResult`).
- [x] 1.5 Expor `loadMore` como input opcional no procedure `pullRequests.list`.

## 2. Interface

- [x] 2.1 Adicionar botão "Load more" no fim da lista agregada, visível apenas quando `hasMore` é verdadeiro.
- [x] 2.2 Estado de carregamento próprio do botão, sem afetar a lista já renderizada.
- [x] 2.3 Falha ao carregar mais preserva os itens já carregados, com estado de erro e nova tentativa (reclicar o botão).
- [x] 2.4 Esconder o botão quando todos os repositórios estiverem esgotados.

## 3. Acessibilidade

- [x] 3.1 Botão "Load more" operável por teclado (elemento `Button` nativo), com anúncio de carregamento/erro via a região `role="status"` já existente na página.

## 4. Qualidade e verificação

- [x] 4.1 Testes unitários para agregação com `hasMore` (todos esgotados vs. algum com mais). Deduplicação ao acrescentar página vive em `listRepositoryPullRequests`, que chama `gh` diretamente (mesmo padrão de outras funções não testadas unitariamente nesta base — verificado por revisão de código e teste manual contra o repositório real).
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [x] 4.3 Validado manualmente contra o repositório real: busquei página 1 (tamanho 3) e página 2 com o cursor retornado — confirmado sem sobreposição nem lacunas entre as páginas, com a query de produção completa (incluindo checks).
