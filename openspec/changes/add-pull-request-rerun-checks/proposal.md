# Change: repetir checks de pull requests diretamente pelo Instructor

## Why

Quarta etapa da fase "Realizar ações no GitHub diretamente pelo Instructor" (Linear `INS-23`). Diferente de comentar/aprovar/solicitar mudanças, essa mutação não usa `gh pr review`/`gh pr comment` — opera sobre execuções do GitHub Actions, exigindo uma abordagem própria.

## What Changes

- Adicionar uma ação "Re-run failed checks" no cabeçalho do detalhe de PR, visível apenas quando há pelo menos um check com falha em um PR aberto/rascunho.
- Ao confirmar, reexecutar apenas os **jobs que falharam** de cada execução (run) distinta do GitHub Actions associada aos checks com falha — nunca a execução inteira, nunca checks que já passaram.
- Um único clique cobre todos os checks com falha do PR (sem botão por check individual).
- Checks que não pertencem ao GitHub Actions (CI de terceiros) não podem ser reexecutados pela API do GitHub; a interface identifica e explica quais checks foram ignorados por esse motivo, sem tentar escondê-los ou fingir sucesso.
- Diálogo de confirmação mostra o destino do PR e a lista de checks que serão reexecutados antes de qualquer chamada ao GitHub.
- Reaproveita a classificação de erro (`classifyGitHubError`) já usada pelas mutações anteriores.

## Non-Goals

- Reexecutar checks de provedores de CI externos (GitHub não expõe essa operação pela API para eles).
- Reexecutar checks individualmente, um de cada vez.
- Reexecutar checks que já passaram, estão pendentes ou foram pulados.
- Aprovar, comentar, solicitar mudanças, mesclar, fechar ou reabrir (etapas próprias).

## Impact

- Affected specs: `pull-request-rerun-checks` (nova capacidade).
- Affected code: `src/main/lib/git/github/pull-requests.ts` (nova função de mutação, extração de run id a partir da URL do check), `src/main/lib/trpc/routers/pull-requests.ts` (novo procedure), novo componente `src/renderer/features/pull-requests/pull-request-rerun-checks-action.tsx`, `src/renderer/features/pull-requests/pull-requests-view.tsx` (novo botão, passando `detail.checkItems`).
- Reutiliza `gh` CLI (`gh run rerun`) via `execWithShellEnv`, `classifyGitHubError`, e o padrão de diálogo de confirmação já estabelecido.
- **Limitação de teste conhecida:** o repositório usado para QA manual (`juliuscaezarff/instructor`) não tem nenhum check de CI configurado hoje, então o caminho de sucesso não pode ser validado manualmente neste ambiente — apenas por revisão de código e (quando disponível) em um repositório com Actions configurado.
- Sem alteração de schema do SQLite, sem nova dependência de produção.

## Approval

Proposta aprovada pelo usuário em 3 de setembro de 2026.
