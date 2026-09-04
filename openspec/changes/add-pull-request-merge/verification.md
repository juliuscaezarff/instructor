## Verification

### Automated

- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 42 testes passaram em 9 arquivos, sem regressão. Nenhum teste novo foi necessário: reaproveita `classifyGitHubError`/`PullRequestStateError`; a lógica de bloqueio/métodos permitidos é lookup/filtro trivial (mesmo nível de `STATE_COPY`, não testado unitariamente no restante do projeto).
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: mesma contagem de diagnósticos do baseline (201), nenhum novo apontando para os arquivos alterados.

### Investigation

Confirmado contra o repositório real antes de implementar:
- `gh pr merge --help`: `-m/--merge`, `-s/--squash`, `-r/--rebase`, `--admin`, `-d/--delete-branch` — usamos só os três primeiros.
- `gh api repos/juliuscaezarff/instructor`: os três métodos são permitidos (`allow_merge_commit`, `allow_squash_merge`, `allow_rebase_merge` todos `true`), `allow_auto_merge: false`.
- `gh pr view --json mergeStateStatus,mergeable`: campo válido, retornou `CLEAN`/`MERGEABLE` no PR de teste.
- `main` neste repositório não tem branch protection (`404 Branch not protected`) — confirma a limitação de teste já registrada na proposta.

### Implemented flow

- Botão "Merge" no cabeçalho, visível apenas quando `item.state === "open"` (rascunho, fechado e mesclado nunca oferecem a ação).
- Ao abrir o diálogo, busca sob demanda (`pullRequests.mergeOptions`) quais métodos o repositório permite; se só um, pré-seleciona; se mais de um, exige escolha explícita (nenhum rádio pré-marcado).
- Aviso fixo de irreversibilidade sempre visível no diálogo.
- Se `mergeStateStatus` for `DIRTY` ou `BLOCKED`, a confirmação fica desabilitada com o motivo explicado, sem sequer tentar a chamada.
- Envio via `gh pr merge <number> --repo <owner>/<repo> --merge|--squash|--rebase` — nunca `--admin`, nunca `--delete-branch`.
- Sucesso invalida `detail`/`activity`/`list`; o evento de merge já aparece na timeline de Atividade automaticamente (reaproveita o trabalho de `MergedEvent` feito em `add-pull-request-detail`).
- Nenhuma outra mutação (fechar, reabrir, comentar, aprovar, solicitar mudanças, repetir checks) é exposta por este fluxo.

### Pending manual QA

Este ambiente não tem acesso a um repositório com branch protection nem a uma janela Electron interativa. Falta validar manualmente:

1. Merge bem-sucedido com cada método, em um repositório que permita os três.
2. Bloqueio por `DIRTY` (conflito real) e por `BLOCKED` (checks/revisão obrigatória).
3. Repositório com apenas um método permitido (pré-seleção sem exigir escolha).
4. Falta de permissão de merge.
5. Navegação por teclado, foco, e leitor de tela no diálogo e no grupo de rádio.

Nenhum commit ou PR foi criado nesta implementação além dos já registrados no histórico do branch `feat/pull-request-actions`.
