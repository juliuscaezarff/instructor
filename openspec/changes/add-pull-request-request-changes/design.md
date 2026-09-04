## Context

Terceira mutação no GitHub, construída sobre o mesmo alicerce de `add-pull-request-comments` (transporte via `execFile`, sem shell) e `add-pull-request-approval` (`gh pr review`, diálogo de confirmação, invalidação de `detail`/`activity`/`list`). A única diferença estrutural é o tipo de revisão e a obrigatoriedade do corpo.

## Goals / Non-Goals

- Goals:
  - Enviar uma revisão de "request changes" com justificativa obrigatória, sem sair do Instructor.
  - Reaproveitar 100% da classificação de erro e do padrão de confirmação já validados nas duas etapas anteriores.
- Non-Goals:
  - Qualquer outro tipo de revisão nesta etapa.
  - Tornar o corpo opcional (o GitHub já rejeita `--request-changes` sem `--body`; replicamos a mesma exigência do lado do cliente para falhar cedo com uma mensagem clara, em vez de deixar o erro genérico da CLI aparecer).

## Decisions

### Comando

`gh pr review <number> --repo <owner>/<repo> --request-changes --body <texto>`. Diferente de `approvePullRequest`, o `body` aqui é obrigatório: validado tanto no schema zod do router (`min(1)`) quanto no botão de confirmação do diálogo (desabilitado enquanto o campo estiver vazio).

### Reuso de infraestrutura

- `classifyGitHubError` e suas categorias (`gh_permission_denied`, `gh_not_authenticated`, `gh_not_found`, `unknown`) são reutilizadas sem alteração.
- `MAX_REVIEW_BODY_CHARS` de `shared/pull-request-review.ts` é reutilizado como limite do corpo, já que é o mesmo limite de revisão do GitHub usado por Approve.
- O componente de diálogo replica a estrutura de `PullRequestApproveAction` (mesmo padrão de confirmação, `busyRef`, foco devolvido ao fechar), mudando apenas o rótulo, o ícone e a obrigatoriedade do campo.

### Disponibilidade e pós-resultado

Mesma regra de Approve: ação visível apenas para PRs `open`/`draft`. Após sucesso, invalida `pullRequests.detail`, `pullRequests.activity` e `pullRequests.list` — nenhuma revisão é assumida localmente antes do refetch confirmar o novo `reviewState`.

## Risks / Trade-offs

- Duplicar a estrutura de diálogo entre Approve e Request Changes em vez de extrair um componente genérico agora. Aceito conscientemente: as duas ações têm nuances diferentes o bastante (corpo opcional vs. obrigatório, cor/ícone) para que a abstração precoce custe mais do que a duplicação, seguindo a diretriz do projeto de preferir três linhas semelhantes a uma abstração prematura. Se uma terceira variante de revisão aparecer, extrair um componente compartilhado passa a valer a pena.

## Migration Plan

Não há migração de dados. Nova função e novo procedure são aditivos. Em rollback, remover o botão e o procedure não afeta comentário, aprovação ou leitura existente.

## Open Questions

Nenhuma questão bloqueante.
