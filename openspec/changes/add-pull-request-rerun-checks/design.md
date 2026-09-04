## Context

O detalhe de PR já normaliza `checkItems: PullRequestCheck[]` (`name`, `state`, `url`) a partir de `statusCheckRollup` (`gh pr view --json`). Nem esse campo nem `gh pr checks --json` (`bucket, completedAt, description, event, link, name, startedAt, state, workflow`) expõem o id numérico da execução (`run id`) do GitHub Actions necessário para `gh run rerun <run-id>`. Confirmado via `gh pr checks --help` e `gh run rerun --help` durante a investigação desta proposta.

## Goals / Non-Goals

- Goals:
  - Reexecutar, com um clique, todos os jobs que falharam nos checks de um PR, sem sair do Instructor.
  - Nunca reexecutar checks que já passaram, estão pendentes ou pertencem a provedores fora do GitHub Actions.
  - Ser honesto quando um check não pode ser reexecutado, em vez de falhar silenciosamente ou fingir sucesso.
- Non-Goals:
  - Suportar CI de terceiros (tecnicamente impossível pela API do GitHub para esses provedores).
  - Granularidade por check individual (decisão explícita: um botão só para o PR inteiro).

## Decisions

### Extração do run id

Checks do GitHub Actions expõem sua URL de detalhe no formato `https://github.com/<owner>/<repo>/actions/runs/<runId>/job/<jobId>`. A função de mutação aplica um regex (`/\/actions\/runs\/(\d+)/`) na `url` de cada check com `state === "failure"`. Checks cuja URL não casa com esse padrão (CI externo, ou URL ausente) são classificados como não suportados e listados separadamente — nunca omitidos silenciosamente.

### Agrupamento e comando

Vários checks com falha podem pertencer à mesma execução (ex.: matriz de jobs). Os run ids extraídos são deduplicados antes de qualquer chamada. Para cada run id único: `gh run rerun <runId> --repo <owner>/<repo> --failed` — reexecuta apenas os jobs que falharam naquela execução, preservando os que já passaram. Nunca usar `gh run rerun` sem `--failed` (isso reexecutaria a execução inteira, incluindo jobs que já passaram).

### Resultado agregado, não tudo-ou-nada

Diferente das mutações anteriores (uma chamada, um resultado), esta pode envolver múltiplas execuções distintas. A função retorna um resumo: quantas execuções foram reexecutadas com sucesso, quais checks foram ignorados por não serem do GitHub Actions, e quais execuções falharam ao tentar reexecutar (com a mensagem classificada). Falha total (nenhuma execução reexecutada com sucesso e havia pelo menos uma tentativa) vira erro; sucesso parcial retorna normalmente com o resumo, permitindo que a interface comunique com precisão o que aconteceu.

### Interface

Botão "Re-run failed checks" no cabeçalho do detalhe, visível apenas quando `item.checks.failure > 0` em um PR aberto/rascunho. O diálogo de confirmação lista os checks que serão reexecutados e, quando houver, os que serão ignorados (com o motivo). Reaproveita `CanvasDialogContent`/`Header`/`Body`/`Footer` e `classifyGitHubError`, seguindo o padrão visual já estabelecido em Approve/Request Changes.

### Permissão

Reexecutar um workflow do GitHub Actions exige permissão de escrita no repositório (`actions: write`), a mesma classe de permissão já coberta por `gh_permission_denied`. Nenhuma categoria de erro nova é introduzida nesta etapa; se o teste em um repositório real revelar mensagens não reconhecidas, ajustar `classifyGitHubError` é responsabilidade de uma correção pontual, não desta proposta.

## Risks / Trade-offs

- Extrair o run id por regex na URL é frágil a mudanças no formato de URL do GitHub. Mitigação: se o padrão não casar, o check é tratado como não suportado (falha segura), nunca como erro silencioso.
- Múltiplas execuções falhando parcialmente pode confundir o usuário. Mitigação: resumo explícito na interface (quantas reexecutadas, quantas ignoradas, quantas falharam).
- Sem repositório com CI configurado disponível para QA manual nesta sessão. Mitigação: documentado explicitamente na proposta e na verificação; validação real fica pendente.

## Migration Plan

Não há migração de dados. Nova função e novo procedure são aditivos. Em rollback, remover o botão e o procedure não afeta nenhuma leitura ou mutação existente.

## Open Questions

Nenhuma questão bloqueante.
