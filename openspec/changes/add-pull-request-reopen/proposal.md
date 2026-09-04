# Change: reabrir pull requests diretamente pelo Instructor

## Why

Quinta etapa da fase "Realizar ações no GitHub diretamente pelo Instructor" (Linear `INS-17`). Primeira mutação de estado do PR em si (em vez de revisão/CI) — abre caminho para Fechar (`INS-19`) e Merge (`INS-18`), que reaproveitam a mesma estrutura.

## What Changes

- Adicionar uma ação "Reopen" no cabeçalho do detalhe de PR, visível apenas para PRs **fechados** (não mesclados — o GitHub não permite reabrir um PR mesclado, e a API rejeitaria a tentativa).
- Diálogo de confirmação mostrando o destino do PR, com um campo de comentário opcional (o `gh pr reopen` aceita `--comment`).
- Enviar apenas mediante confirmação explícita.
- Reaproveitar a classificação de erro já usada pelas mutações anteriores.
- Após o resultado, atualizar resumo e lista com o estado real do GitHub.

## Non-Goals

- Fechar ou mesclar PRs (etapas próprias, `INS-19` e `INS-18`).
- Reabrir automaticamente PRs fechados por outros eventos (ex.: branch deletada).
- Comentar, aprovar, solicitar mudanças ou repetir checks (etapas já implementadas, sem relação com esta).

## Impact

- Affected specs: `pull-request-reopen` (nova capacidade).
- Affected code: `src/main/lib/git/github/pull-requests.ts` (nova função de mutação, nova classe de erro `PullRequestStateError` reutilizável por Fechar), `src/main/lib/trpc/routers/pull-requests.ts` (novo procedure), novo componente `src/renderer/features/pull-requests/pull-request-reopen-action.tsx`, `src/renderer/features/pull-requests/pull-requests-view.tsx` (novo botão no cabeçalho).
- Reutiliza `gh` CLI (`gh pr reopen`) via `execWithShellEnv`, `classifyGitHubError`, `MAX_COMMENT_BODY_CHARS` e o padrão de diálogo já estabelecido.
- Sem alteração de schema do SQLite, sem nova dependência de produção.

## Approval

Proposta aprovada pelo usuário em 3 de setembro de 2026.
