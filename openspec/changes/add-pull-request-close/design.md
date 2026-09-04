## Context

Sexta mutação, espelho direto de `add-pull-request-reopen`. Confirmado via `gh pr close --help` que o comando aceita `-c/--comment` (mesma forma de `gh pr reopen`) e `-d/--delete-branch` (fora do escopo desta etapa).

## Goals / Non-Goals

- Goals:
  - Fechar um PR aberto/rascunho com confirmação explícita, opcionalmente com um comentário.
  - Reaproveitar 100% a estrutura já validada em Reabrir (`PullRequestStateError`, componente de diálogo, invalidação de cache).
- Non-Goals:
  - Deletar branch ao fechar.
  - Reabrir ou mesclar nesta etapa.

## Decisions

### Comando

`gh pr close <number> --repo <owner>/<repo>`, adicionando `--comment <texto>` apenas quando preenchido. Corpo limitado por `MAX_COMMENT_BODY_CHARS`, igual a Reabrir.

### Reuso total

`closePullRequest` tem a mesma forma de `reopenPullRequest` (só troca o subcomando do `gh`) e lança `PullRequestStateError` já existente — nenhuma classe nova. O componente de diálogo é uma cópia estrutural de `PullRequestReopenAction`, trocando rótulo, ícone e a condição de visibilidade (`open`/`draft` em vez de `closed`).

### Disponibilidade

Ação visível apenas quando `item.state === "open" || item.state === "draft"`. PRs já fechados ou mesclados não oferecem a ação.

## Risks / Trade-offs

- Nenhum risco novo além dos já mitigados em Reabrir — mesma superfície de comando e erro.

## Migration Plan

Não há migração de dados. Nova função e novo procedure são aditivos. Em rollback, remover o botão e o procedure não afeta nenhuma leitura ou mutação existente.

## Open Questions

Nenhuma questão bloqueante.
