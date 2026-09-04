# Change: fechar pull requests diretamente pelo Instructor

## Why

Sexta etapa da fase "Realizar ações no GitHub diretamente pelo Instructor" (Linear `INS-19`). Espelha `add-pull-request-reopen` (`INS-17`): mesma forma de comando, mesma classe de erro (`PullRequestStateError`), mesmo padrão de diálogo — só troca `reopen` por `close`.

## What Changes

- Adicionar uma ação "Close" no cabeçalho do detalhe de PR, visível apenas para PRs **abertos ou em rascunho**.
- Diálogo de confirmação mostrando o destino do PR, com um campo de comentário opcional (`gh pr close` aceita `--comment`).
- Enviar apenas mediante confirmação explícita.
- Reaproveitar `PullRequestStateError`/`classifyGitHubError` já criados para Reabrir.
- Após o resultado, atualizar resumo e lista com o estado real do GitHub.

## Non-Goals

- Reabrir ou mesclar PRs (`INS-17`, já implementado; `INS-18`, próxima etapa).
- Deletar a branch ao fechar (`gh pr close --delete-branch` existe, mas não foi pedido; fechar não deve ter efeitos colaterais além de fechar).
- Comentar, aprovar, solicitar mudanças ou repetir checks (etapas já implementadas, sem relação com esta).

## Impact

- Affected specs: `pull-request-close` (nova capacidade).
- Affected code: `src/main/lib/git/github/pull-requests.ts` (nova função de mutação, reaproveitando `PullRequestStateError`), `src/main/lib/trpc/routers/pull-requests.ts` (novo procedure), novo componente `src/renderer/features/pull-requests/pull-request-close-action.tsx`, `src/renderer/features/pull-requests/pull-requests-view.tsx` (novo botão no cabeçalho).
- Reutiliza `gh` CLI (`gh pr close`) via `execWithShellEnv`, `classifyGitHubError`, `MAX_COMMENT_BODY_CHARS` e o padrão de diálogo já estabelecido.
- Sem alteração de schema do SQLite, sem nova dependência de produção.

## Approval

Proposta aprovada pelo usuário em 3 de setembro de 2026.
