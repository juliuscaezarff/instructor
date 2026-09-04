# Change: ordenar a lista de pull requests

## Why

Segunda etapa da fase "Produtividade" (Linear `INS-25`). Reaproveita a base de `add-pull-request-pagination`: a busca já usa `gh api graphql` com `search(query: "... sort:<critério>")`, então ordenar é parametrizar um valor que já é fixo hoje.

## What Changes

- Adicionar um controle de ordenação na barra de ferramentas da central, com o critério ativo sempre visível.
- Critérios suportados (confirmados contra a API real): **Recently updated** (padrão atual), **Newest** (criado, mais recente primeiro), **Oldest** (criado, mais antigo primeiro).
- Trocar o critério reinicia a paginação (nova primeira página) — não dá para continuar "Load more" sobre uma ordenação antiga.
- Preferência de ordenação persiste localmente entre sessões, mesmo padrão já usado pelos filtros de estado/repositório existentes.

## Non-Goals

- Ordenação por comentários/reações ou outros critérios testados mas não escolhidos.
- Filtros combináveis por autor/reviewer/check/agente (etapa própria seguinte, `INS-26`).
- Ordenação persistente no servidor ou por usuário compartilhado — é preferência local, como os filtros já existentes.

## Impact

- Affected specs: `pull-request-sort` (nova capacidade); modifica o comportamento de busca já descrito em `pull-request-pagination`.
- Affected code: `src/main/lib/git/github/pull-requests.ts` (parametrizar o `sort:` da query `search`), `src/main/lib/trpc/routers/pull-requests.ts` (input `sort` no procedure `list`), `src/renderer/features/pull-requests/atoms.ts` (novo átomo persistido), `src/renderer/features/pull-requests/pull-requests-view.tsx` (controle de ordenação na toolbar).
- Reutiliza a infraestrutura de busca/paginação já implementada; nenhuma dependência nova.

## Approval

Proposta aprovada pelo usuário em 4 de setembro de 2026, com os 3 critérios confirmados.
