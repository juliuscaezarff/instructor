## Context

Segunda mutação no GitHub implementada pelo Instructor, após `add-pull-request-comments`. Reaproveita a mesma base: `execWithShellEnv` (execFile, sem shell), classificação tolerante de erro do `gh`, e o padrão de diálogo de confirmação já validado em `PullRequestAgentActions`.

## Goals / Non-Goals

- Goals:
  - Aprovar um PR sem sair do Instructor, com confirmação explícita do destino.
  - Refletir o novo estado de revisão (resumo, reviewers, lista) com dados reais do GitHub após o resultado.
  - Reaproveitar o padrão de erro de permissão já estabelecido, sem introduzir uma segunda taxonomia.
- Non-Goals:
  - Solicitar mudanças ou qualquer outro tipo de revisão além de aprovação.
  - Qualquer outra mutação no GitHub além de enviar uma aprovação.

## Decisions

### Comando

Usar `gh pr review <number> --repo <owner>/<repo> --approve`, adicionando `--body <texto>` apenas quando o usuário digitar um comentário (a aprovação em si é sempre opcionalmente comentada, diferente do comentário de PR, cujo corpo é obrigatório). Diferente de `gh pr comment`, `gh pr review --approve` não imprime uma URL confiável em stdout, então a mutação não tenta fabricar um retorno estruturado: sucesso é sinalizado e o cliente busca o estado atualizado via refetch.

### Confirmação

Ação exposta como botão no cabeçalho do detalhe (mesma área de `PullRequestAgentActions`), abrindo um diálogo com repositório/número/título do PR e campo opcional de comentário, reaproveitando o componente `Dialog` já usado no fluxo de escolha de workspace. Nenhuma aprovação é enviada sem confirmação explícita no diálogo.

### Disponibilidade da ação

A ação só é renderizada para PRs com `state` `open` ou `draft`. PRs mesclados ou fechados não oferecem a ação, evitando uma chamada que o GitHub rejeitaria de qualquer forma. Não há verificação antecipada de autoria (usuário aprovando o próprio PR); esse é um erro que o GitHub retorna (`Unprocessable Entity: Can not approve your own pull request`), tratado pelo caminho de erro genérico com o texto retornado pela CLI, sem uma categoria dedicada — mensagens de validação do GitHub já são compreensíveis o suficiente para exibição direta.

### Erro e permissão

Reaproveita `classifyGitHubError`/`gh_permission_denied` de `add-pull-request-comments` sem alterações. Nenhuma nova categoria é introduzida nesta etapa.

### Atualização pós-resultado

Após sucesso, invalidar `pullRequests.detail` (reviewers, mergeable), `pullRequests.activity` (a aprovação aparece como evento de revisão) e `pullRequests.list` (o resumo de `reviewState` na lista agregada) para o PR afetado. Nenhum dado de revisão é fabricado localmente.

## Risks / Trade-offs

- `gh pr review --approve` pode ter saída silenciosa em sucesso; não há forma confiável de confirmar o resultado além do refetch subsequente. Mitigação: refetch imediato de detail/activity/list após a mutação resolver sem erro.
- Mensagens de validação do GitHub (ex.: autoaprovação) variam entre organizações/proteções de branch. Mitigação: exibir o texto de erro retornado pela CLI em vez de tentar prever todos os casos.

## Migration Plan

Não há migração de dados. Nova função e novo procedure são aditivos. Em rollback, remover o botão e o procedure não afeta o resumo/atividade de leitura existente.

## Open Questions

Nenhuma questão bloqueante.
