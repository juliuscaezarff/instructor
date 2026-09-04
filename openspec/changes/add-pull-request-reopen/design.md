## Context

Quinta mutação, primeira sobre o estado do PR (não revisão nem CI). Confirmado via `gh pr reopen --help` que o comando aceita `-c/--comment` opcional, seguindo o mesmo formato de `gh pr comment`/`gh pr review`.

## Goals / Non-Goals

- Goals:
  - Reabrir um PR fechado com confirmação explícita, opcionalmente com um comentário.
  - Estabelecer uma classe de erro (`PullRequestStateError`) e um componente de ação reutilizáveis por Fechar (`INS-19`), já que os dois comandos (`gh pr reopen`/`gh pr close`) têm a mesma forma.
- Non-Goals:
  - Fechar ou mesclar nesta etapa.

## Decisions

### Comando

`gh pr reopen <number> --repo <owner>/<repo>`, adicionando `--comment <texto>` apenas quando o usuário escrever algo. Corpo limitado por `MAX_COMMENT_BODY_CHARS` (é um comentário normal de PR, não uma revisão).

### Disponibilidade

Ação visível apenas quando `item.state === "closed"`. PRs mesclados não podem ser reabertos pelo GitHub (tentativa retornaria erro); a interface simplesmente não oferece a ação nesse caso, consistente com o padrão já usado em Approve/Request Changes (não oferecer uma ação que o GitHub garantidamente rejeitaria).

### Nomenclatura preparando Fechar

A classe de erro criada aqui chama-se `PullRequestStateError` (não `PullRequestReopenError`), porque `INS-19` (Fechar) vai reaproveitá-la sem modificação — mesma forma de comando, mesmo tipo de falha possível.

## Risks / Trade-offs

- Reabrir um PR cuja branch de origem foi deletada pode falhar ou deixar o PR num estado sem commits visíveis. Mitigação: o GitHub já lida com isso nativamente (o PR reabre mas mostra a branch ausente); não é responsabilidade desta etapa duplicar essa lógica.

## Migration Plan

Não há migração de dados. Nova função e novo procedure são aditivos. Em rollback, remover o botão e o procedure não afeta nenhuma leitura ou mutação existente.

## Open Questions

Nenhuma questão bloqueante.
