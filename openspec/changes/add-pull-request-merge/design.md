## Context

Sétima e última mutação da fase. Investigação feita antes de propor, contra o repositório real:

- `gh pr merge --help`: aceita `-m/--merge`, `-s/--squash`, `-r/--rebase` (mutuamente exclusivos), além de `--admin` (bypass), `-d/--delete-branch`, `-t/--subject`, `-b/--body`, `--auto`.
- `gh api repos/<owner>/<repo>` retorna `allow_merge_commit`, `allow_squash_merge`, `allow_rebase_merge`, `allow_auto_merge`, `delete_branch_on_merge` — confirmado no repositório de teste: os três métodos são permitidos, auto-merge desabilitado.
- `gh pr view --json mergeStateStatus,mergeable` confirmado como campo válido (`CLEAN`, `MERGEABLE` no PR de teste). Valores possíveis de `mergeStateStatus`: `BEHIND`, `BLOCKED`, `CLEAN`, `DIRTY`, `DRAFT`, `HAS_HOOKS`, `UNKNOWN`, `UNSTABLE`.
- `main` neste repositório não tem branch protection (`404 Branch not protected`), então os cenários de bloqueio real não são testáveis aqui.

## Goals / Non-Goals

- Goals:
  - Mesclar um PR aberto e pronto (não rascunho) com o método explicitamente escolhido pelo usuário, respeitando as restrições reais do repositório.
  - Nunca oferecer um caminho que contorne proteção de branch.
  - Recusar a tentativa antes de chamar o GitHub quando já se sabe que falharia (conflito ou bloqueio conhecido), em vez de deixar o usuário descobrir só no erro.
- Non-Goals:
  - `--admin`, `--delete-branch`, customização de mensagem de commit, merge queue.

## Decisions

### Métodos de merge sob demanda

Ao abrir o diálogo, uma consulta separada (`pullRequests.mergeOptions`) busca `allow_merge_commit`/`allow_squash_merge`/`allow_rebase_merge` do repositório via `gh api repos/<owner>/<repo>`. Apenas os métodos permitidos aparecem como opção. Se só um método é permitido, ele é pré-selecionado sem exigir escolha adicional; se mais de um, a confirmação exige seleção explícita (nenhum default silencioso entre múltiplas opções válidas).

Por que consulta separada e não parte do `detail`: são dados de repositório, não de PR — mudam raramente e não devem ser buscados a cada abertura do painel (mantém o carregamento sob demanda já estabelecido no projeto).

### Bloqueio preventivo por `mergeStateStatus`

`PullRequestDetail` passa a incluir `mergeStateStatus`. A ação de merge:
- Nunca aparece para PR que não seja `state === "open"` (exclui rascunho, fechado, mesclado — mesmo padrão de Approve/Request Changes/Rerun Checks).
- Fica desabilitada com explicação quando `mergeStateStatus` é `DIRTY` (conflito: "This branch has conflicts that must be resolved on GitHub first") ou `BLOCKED` (restrição: "Required checks or reviews are not satisfied yet").
- Demais valores (`CLEAN`, `UNSTABLE`, `BEHIND`, `HAS_HOOKS`, `UNKNOWN`) permitem tentar — o GitHub é a fonte de verdade final; um valor não reconhecido não deve bloquear preventivamente sem necessidade.

### Comando

`gh pr merge <number> --repo <owner>/<repo> --merge|--squash|--rebase`, nunca `--admin`, nunca `--delete-branch`. Sem `-t`/`-b` — mensagem de commit padrão do GitHub.

### Confirmação

Diálogo mostra destino do PR, seletor do(s) método(s) disponível(is) e um aviso curto de que a ação é irreversível. Segue o mesmo `CanvasDialogContent` das demais ações, com botão de confirmação em `variant="destructive"` dado o peso da operação.

### Pós-resultado

Sucesso invalida `detail`/`activity`/`list`, igual às demais mutações — o novo evento de merge já aparece na timeline de Atividade automaticamente (reaproveita o `MergedEvent` do `timelineItems`, já implementado em `add-pull-request-detail`).

## Risks / Trade-offs

- `mergeStateStatus` não cobre 100% dos motivos de bloqueio (ex.: regras de organização não expostas pela API). Mitigação: bloqueio preventivo é uma otimização de UX, não a única defesa — o GitHub sempre valida no lado dele; erros não previstos caem no tratamento de erro genérico já existente.
- Nenhum protection rule configurado no repositório de teste impede validar `BLOCKED` de ponta a ponta. Mitigação: documentado como limitação conhecida, mesma abordagem já usada em `add-pull-request-rerun-checks`.
- Escolher o método errado é irreversível (squash vs. merge commit mudam o histórico de forma diferente). Mitigação: nenhum default silencioso quando há mais de uma opção válida; o usuário sempre escolhe explicitamente antes de confirmar.

## Migration Plan

Não há migração de dados. Novas funções e novos procedures são aditivos. Em rollback, remover o botão e os procedures não afeta nenhuma leitura ou mutação existente.

## Open Questions

Nenhuma questão bloqueante — mas a implementação assume que o usuário concorda com as decisões acima (sem `--admin`, sem delete-branch, bloqueio preventivo por `mergeStateStatus`) antes de prosseguir.
