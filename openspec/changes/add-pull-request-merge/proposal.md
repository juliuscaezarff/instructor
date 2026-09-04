# Change: mesclar pull requests diretamente pelo Instructor

## Why

Última etapa da fase "Realizar ações no GitHub diretamente pelo Instructor" (Linear `INS-18`). É a mutação mais arriscada do conjunto — irreversível de fato (diferente de fechar/reabrir, que podem ser desfeitos um pelo outro) — e a única que exige escolher entre múltiplos métodos e respeitar restrições de proteção de branch em vez de apenas confirmar uma ação.

## What Changes

- Adicionar uma ação "Merge" no cabeçalho do detalhe de PR, visível apenas para PRs **abertos e não-rascunho**.
- Buscar sob demanda, ao abrir o diálogo, quais métodos de merge o repositório permite (`merge`/`squash`/`rebase`) e oferecer apenas os habilitados.
- Buscar o `mergeStateStatus` do PR (via `gh pr view --json`) e bloquear a confirmação com explicação quando o GitHub já indica que o merge falharia: `DIRTY` (conflitos) ou `BLOCKED` (checks/revisões obrigatórias pendentes).
- Diálogo de confirmação exige escolha explícita do método quando houver mais de um disponível, mostra o destino do PR e o método selecionado antes de qualquer chamada.
- Enviar apenas mediante confirmação explícita, com o método escolhido: `gh pr merge --merge|--squash|--rebase`.
- Reaproveitar a classificação de erro já usada pelas mutações anteriores.
- Após o resultado, atualizar resumo e lista com o estado real do GitHub (`merged`).

## Non-Goals

- Usar `--admin` para contornar checks obrigatórios, revisões pendentes ou regras de proteção de branch — a diretriz do Linear é explícita: "sem contornar restrições". Se o GitHub bloquear, a interface explica o motivo e não oferece um caminho alternativo de bypass.
- Deletar a branch após o merge (`--delete-branch`) — fora do escopo pedido, mesma decisão já tomada em Fechar (`add-pull-request-close`) para o mesmo tipo de flag.
- Customizar o assunto/corpo do commit de merge — usa a mensagem padrão gerada pelo GitHub.
- Merge queue / auto-merge — não aplicável a este repositório (`allow_auto_merge: false`) e fora do escopo desta etapa.
- Reabrir, fechar, comentar, aprovar, solicitar mudanças ou repetir checks (etapas já implementadas).

## Impact

- Affected specs: `pull-request-merge` (nova capacidade).
- Affected code: `src/main/lib/git/github/pull-requests.ts` (nova função de mutação, nova consulta de métodos permitidos, extensão do `PullRequestDetail` com `mergeStateStatus`), `src/main/lib/trpc/routers/pull-requests.ts` (dois novos procedures: `mergeOptions` e `merge`), novo componente `src/renderer/features/pull-requests/pull-request-merge-action.tsx`, `src/renderer/features/pull-requests/pull-requests-view.tsx` (novo botão no cabeçalho).
- Reutiliza `gh pr merge`, `gh api repos/<owner>/<repo>` (flags de merge do repositório), `classifyGitHubError` e o padrão de diálogo já estabelecido.
- **Limitação de teste conhecida:** o repositório de QA (`juliuscaezarff/instructor`) não tem branch protection configurada em `main`, então os cenários de `BLOCKED`/checks obrigatórios não podem ser validados manualmente aqui — apenas por revisão de código, consistente com a limitação já registrada em `add-pull-request-rerun-checks`.
- Sem alteração de schema do SQLite, sem nova dependência de produção.

## Approval

Proposta aprovada pelo usuário em 4 de setembro de 2026, confirmando as três decisões levantadas (sem `--admin`, sem `--delete-branch`, bloqueio preventivo por `mergeStateStatus`).
