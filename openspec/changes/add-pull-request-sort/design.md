## Context

Confirmado via `gh api graphql` contra o repositório real: `sort:created-desc`, `sort:created-asc`, `sort:updated-desc`, `sort:updated-asc`, `sort:comments-desc`, `sort:reactions-desc` funcionam sem erro na query `search`. Escolhidos 3 para a interface: `updated-desc` (padrão atual), `created-desc`, `created-asc`.

## Goals / Non-Goals

- Goals: permitir trocar o critério de ordenação sem quebrar a paginação existente; manter a escolha visível e persistida localmente.
- Non-Goals: critérios adicionais, ordenação no servidor por usuário.

## Decisions

### Critério embutido na query de busca

`fetchPullRequestSearchPage` passa a receber um parâmetro `sort` (`"updated_desc" | "created_desc" | "created_asc"`) e monta `sort:updated-desc`/`sort:created-desc`/`sort:created-asc` na string de busca, no lugar do valor fixo atual.

### Troca de critério reinicia a paginação

O cache por repositório (`listCache`) é indexado só pela chave do repositório hoje; ordenação diferente produziria uma sequência de páginas incompatível com o cursor já guardado. Ao trocar o critério, a busca é tratada como uma atualização completa (equivalente a `forceRefresh`): descarta cursor/itens acumulados do repositório e busca a primeira página do novo critério. "Load more" com o critério novo continua paginando normalmente a partir daí.

### Persistência local

Novo átomo Jotai persistido (`pullRequestSortAtom`), mesmo padrão de `pullRequestStateFilterAtom`/`pullRequestRepositoryFilterAtom` já existentes — preferência de UI local, não sincronizada nem salva no banco.

### Interface

Controle compacto na toolbar (dropdown), mostrando o critério ativo por extenso (ex.: "Sort: Recently updated"). Reaproveita `DropdownMenu` já usado no filtro de repositórios.

## Risks / Trade-offs

- Nenhum risco novo além dos já mitigados em `add-pull-request-pagination` — mesma superfície de busca, só parametrizando um valor já testado.

## Migration Plan

Não há migração de dados. Aditivo; em rollback, remover o controle e fixar `sort:updated-desc` restaura o comportamento anterior.

## Open Questions

Nenhuma questão bloqueante.
