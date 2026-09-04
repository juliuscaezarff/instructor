## Context

Investigação feita contra o repositório real antes de propor:

- `gh pr list --help`: só tem `--limit` (busca do início até N; sem `--after`/cursor). Não dá pra "carregar mais" sem rebuscar tudo.
- `gh api graphql` com `search(query: "repo:<owner>/<repo> is:pr sort:updated-desc", type: ISSUE, first, after)`: confirmado funcionando, com `pageInfo.hasNextPage`/`endCursor` reais e ordenação via qualificador `sort:` na própria query string.
- Testado: uma busca `search` unificada com múltiplos `repo:` qualifiers, incluindo um repositório inválido, **não retorna erro** — simplesmente omite os resultados desse repositório da resposta. Isso tornaria impossível reportar qual repositório falhou, quebrando o requisito já implementado e em produção (`pull-request-center`: "Partial repository failure... announces that some repositories could not be refreshed").

## Goals / Non-Goals

- Goals:
  - Paginação real por cursor, por repositório, preservando o isolamento de falha por repositório já existente.
  - Base consistente para Ordenar (`INS-25`) e Filtrar (`INS-26`) sem retrabalho — ambos vão apenas alterar a query string da mesma busca `search`.
- Non-Goals:
  - Unificar múltiplos repositórios numa única busca `search` (decisão explícita, ver Context).
  - Ordenação/filtros configuráveis nesta etapa — usa `sort:updated-desc` fixo.

## Decisions

### Busca por repositório via GraphQL `search`

Cada repositório configurado continua sendo buscado com sua própria chamada, em paralelo (`mapWithConcurrency`, já existente), só trocando o comando: `gh api graphql` com `search(query: "repo:<owner>/<repo> is:pr sort:updated-desc", type: ISSUE, first: 50, after: $cursor)` no lugar de `gh pr list --json`. Os nós retornados usam `... on PullRequest { ... }` com os mesmos campos já normalizados hoje (`number, title, url, state, isDraft, author, createdAt, updatedAt, mergedAt, additions, deletions, reviewDecision`); `statusCheckRollup` é obtido via `commits(last: 1) { nodes { commit { statusCheckRollup { contexts(first: 100) { nodes { ... } } } } } }`, o mesmo caminho que o `gh` CLI já resolve internamente para o campo equivalente.

### Estado de paginação no cache do processo main

`listCache` passa a guardar, por repositório, além dos itens: `hasNextPage` e `endCursor`. O procedure `list` ganha um input `loadMore?: boolean`:
- Sem `loadMore` (ou com `refreshToken`): busca a primeira página, substitui o cache do repositório.
- Com `loadMore`: para cada repositório com `hasNextPage: true`, busca a próxima página com `after: endCursor` e **acrescenta** ao array já cacheado (deduplicando por `key`); repositórios já esgotados (`hasNextPage: false`) são pulados sem nova chamada ao `gh`.

O resultado agregado (`PullRequestListResult`) ganha um campo `hasMore: boolean` (verdadeiro se qualquer repositório ainda tiver próxima página), usado pela interface para mostrar/esconder o botão "Load more".

### Falha ao carregar mais

Uma falha ao buscar a próxima página de um repositório específico não descarta os itens já carregados desse ou de outros repositórios — vira uma entrada em `failures`, igual ao comportamento já existente para a carga inicial. A lista permanece utilizável; o usuário pode tentar "Load more" de novo.

### Interface

Botão "Load more" no fim da lista agregada, visível apenas quando `hasMore` é verdadeiro. Estado de carregamento próprio (spinner no botão), sem afetar a lista já renderizada. Ao terminar (todos os repositórios esgotados), o botão desaparece; uma falha mantém o botão visível com estado de erro e nova tentativa.

## Risks / Trade-offs

- Cache de paginação vive em memória do processo main (não persiste entre reinícios do app) — aceitável, mesmo comportamento de cache curto já usado em todo o resto da central.
- Repositórios com muitos PRs (>50) agora exigem cliques adicionais de "Load more" em vez de uma carga única maior — trade-off aceito em troca de não buscar mais do que o necessário por padrão.

## Migration Plan

Não há migração de dados. Cache em memória é substituído de forma transparente. Em rollback, reverter para `gh pr list --json` remove a paginação sem afetar a carga inicial.

## Open Questions

Nenhuma questão bloqueante.
