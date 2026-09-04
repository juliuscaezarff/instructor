# Change: solicitar mudanças em pull requests diretamente pelo Instructor

## Why

Terceira etapa da fase "Realizar ações no GitHub diretamente pelo Instructor" (Linear `INS-22`). Reaproveita a infraestrutura de mutação já criada em `add-pull-request-comments` e `add-pull-request-approval`: mesma classificação de erro, mesmo padrão de confirmação e o mesmo comando `gh pr review`, trocando o tipo de revisão.

## What Changes

- Adicionar uma ação "Request changes" no cabeçalho do detalhe de PR, ao lado de Approve e da ação de chat existente.
- Abrir um diálogo de confirmação mostrando repositório, número e título do PR, com um campo de **justificativa obrigatória** (o GitHub rejeita uma revisão de "request changes" sem corpo).
- Enviar a solicitação apenas mediante confirmação explícita, com o texto preservado em caso de falha.
- Reaproveitar a classificação de erro (permissão, autenticação, CLI ausente) já usada por comentários e aprovação.
- Após o resultado, atualizar resumo, reviewers e lista com dados reais do GitHub.
- Disponibilizar a ação apenas para PRs abertos ou em rascunho, como a aprovação.

## Non-Goals

- Aprovar, comentar sem revisão, mesclar, fechar, reabrir ou repetir checks (etapas próprias).
- Revisão inline em linhas de diff.
- Permitir enviar a revisão sem justificativa (o próprio GitHub já impõe essa regra; o Instructor apenas a antecipa na interface).

## Impact

- Affected specs: `pull-request-request-changes` (nova capacidade).
- Affected code: `src/main/lib/git/github/pull-requests.ts` (nova função de mutação), `src/main/lib/trpc/routers/pull-requests.ts` (novo procedure), novo componente `src/renderer/features/pull-requests/pull-request-request-changes-action.tsx`, `src/renderer/features/pull-requests/pull-requests-view.tsx` (novo botão no cabeçalho).
- Reutiliza `gh` CLI via `execWithShellEnv`, `classifyGitHubError`, o padrão de diálogo já usado em `PullRequestApproveAction`, e o limite de corpo `MAX_REVIEW_BODY_CHARS` já definido em `shared/pull-request-review.ts`.
- Sem alteração de schema do SQLite, sem nova dependência de produção.

## Approval

Proposta aprovada pelo usuário em 3 de setembro de 2026.
