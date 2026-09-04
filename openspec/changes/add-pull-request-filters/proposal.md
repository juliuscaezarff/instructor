# Change: filtrar pull requests por autor, reviewer, check e agente

## Why

Terceira etapa da fase "Produtividade" (Linear `INS-26`), reaproveitando a base de `add-pull-request-pagination`/`add-pull-request-sort`. Hoje só existe filtro por estado e busca por texto.

## What Changes

- Adicionar filtros combináveis por **autor** (`author:<login>`), **reviewer** (`reviewed-by:<login>` — quem já revisou o PR, não quem tem revisão pendente), e **estado de checks** (passou/falhou/pendente, via `status:success|failure|pending`).
- Adicionar filtro por **agente vinculado** (Claude Code / Codex / sem agente), a partir dos vínculos explícitos já existentes entre PR e workspace (`chats.linkedAgentProvider`) — nunca inferindo autoria de IA a partir de heurística ou conteúdo do PR.
- Autor, reviewer e check são embutidos na própria query `search` (mesmo mecanismo de `sort:` já implementado), então filtram no servidor e paginam corretamente — só os PRs que casam são buscados/contados.
- Agente é um filtro **local**, aplicado depois da busca (o GitHub não sabe o que é um "agente" do Instructor) — mesmo padrão já usado hoje pelos filtros de estado/repositório.
- Mostrar os filtros ativos e permitir limpá-los individualmente ou todos de uma vez.
- Trocar qualquer filtro de busca (autor/reviewer/check) reinicia a paginação do repositório, igual já acontece ao trocar de ordenação.

## Non-Goals

- Inferir autoria de IA a partir de conteúdo do PR, mensagens de commit ou heurística — só vínculo explícito de workspace já registrado.
- Filtrar por "revisão pendente" (`review-requested:`) — decisão explícita por `reviewed-by:`; revisão pendente se sobrepõe ao escopo de Notificações (`INS-24`, próxima etapa).
- Combinar múltiplos autores/reviewers no mesmo filtro (um valor por vez nesta etapa, como o autor/reviewer já é uma pessoa específica).
- Ordenação (já implementada em `add-pull-request-sort`).

## Impact

- Affected specs: `pull-request-filters` (nova capacidade); modifica o comportamento de busca já descrito em `pull-request-pagination`/`pull-request-sort`.
- Affected code: `src/main/lib/git/github/pull-requests.ts` (parâmetros de filtro na query `search`), `src/main/lib/trpc/routers/pull-requests.ts` (inputs no procedure `list`), `src/renderer/features/pull-requests/atoms.ts` (átomos persistidos), `src/renderer/features/pull-requests/pull-requests-view.tsx` (controles de filtro, chips de filtro ativo).
- Reutiliza a infraestrutura de busca/paginação/ordenação já implementada e o mapa `workspacesByPullRequest` já existente para o vínculo de agente.

## Approval

Proposta aprovada pelo usuário em 4 de setembro de 2026, com a semântica de reviewer confirmada (`reviewed-by:`).
