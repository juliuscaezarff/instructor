# Change: paginar pull requests além de 50 por repositório

## Why

Primeira etapa da fase "Produtividade" (Linear `INS-27`), posterior à fase "Realizar ações no GitHub" já concluída. Hoje a central busca no máximo 50 PRs por repositório (`gh pr list --limit 50`) e não tem como carregar mais. Essa etapa também é a base técnica das duas seguintes (Ordenar `INS-25`, Filtrar `INS-26`), que precisam ficar consistentes com a paginação — por isso vem primeiro.

## What Changes

- Trocar a busca de PRs por repositório de `gh pr list --json` (sem paginação real) para `gh api graphql` usando `search(query: "repo:<owner>/<repo> is:pr ...", type: ISSUE, first, after)`, que suporta paginação por cursor de verdade.
- Manter uma busca **por repositório**, em paralelo, como já é hoje — não unificar todos os repositórios numa única query `search`. Confirmado que o GitHub omite silenciosamente repositórios inválidos/inacessíveis de uma busca unificada, sem sinalizar erro; isso quebraria o requisito já existente de avisar quando um repositório específico falha ao carregar.
- Adicionar uma ação "Load more" na lista agregada, que busca a próxima página de cada repositório que ainda tiver mais resultados (`hasNextPage`), preservando os itens já carregados.
- Evitar duplicatas ao mesclar páginas novas com a lista já carregada.
- Tratar fim dos resultados (todos os repositórios com `hasNextPage: false`) e falha ao carregar mais (sem descartar o que já estava na tela; oferecer nova tentativa).

## Non-Goals

- Ordenação e filtros configuráveis pelo usuário (etapas próprias seguintes, `INS-25` e `INS-26`) — esta etapa usa a ordenação padrão atual (`updatedAt` decrescente) como critério fixo da busca.
- Cache persistente, histórico/métricas, suporte a GitLab/Bitbucket — fora do escopo desta fase (etapa futura de Plataforma).
- Unificar a busca de múltiplos repositórios numa única chamada — decisão explícita pelo motivo acima.

## Impact

- Affected specs: `pull-request-pagination` (nova capacidade); modifica o comportamento de carregamento já descrito em `pull-request-center`.
- Affected code: `src/main/lib/git/github/pull-requests.ts` (nova função de busca via GraphQL, substituindo `listRepositoryPullRequests`), `src/main/lib/trpc/routers/pull-requests.ts` (parâmetro `loadMore` no procedure `list`), `src/renderer/features/pull-requests/pull-requests-view.tsx` (botão/estado de "Load more").
- Reutiliza `gh api graphql`, `classifyGitHubError`, o padrão de estado de carregamento e erro já existente por repositório.
- Sem alteração de schema do SQLite, sem nova dependência de produção.

## Approval

Proposta aprovada pelo usuário em 4 de setembro de 2026.
