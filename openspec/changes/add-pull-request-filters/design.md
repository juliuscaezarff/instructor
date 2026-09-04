## Context

Confirmado via `gh api graphql` contra o repositório real: `author:`, `reviewed-by:`, `review-requested:`, `status:success`, `status:failure` funcionam sem erro e combinam com `sort:` na mesma query `search` (qualificadores separados por espaço, combinados com AND implícito).

## Goals / Non-Goals

- Goals: filtros de autor/reviewer/check reduzem o que é buscado no servidor (não só o que é exibido); filtro de agente usa só vínculos explícitos locais.
- Non-Goals: múltiplos valores por filtro nesta etapa; inferência de autoria de IA.

## Decisions

### Filtros de busca (servidor) vs. filtro local (cliente)

Autor, reviewer e check viram qualificadores adicionais na mesma string de busca já usada por `sort:` — `repo:<owner>/<repo> is:pr author:<login> reviewed-by:<login> status:<state> sort:<critério>`. Cada um é opcional; só entra na string quando o usuário escolhe um valor.

Agente não pode ser um qualificador do GitHub (é um conceito só do Instructor). Continua sendo aplicado no cliente, sobre `data.items`, usando o mesmo `workspacesByPullRequest` já calculado a partir de `chats.linkedAgentProvider` — mesma fonte de dado já usada para mostrar os selos de agente na lista, garantindo que o filtro nunca mostre um vínculo que a interface não mostraria de outra forma.

### Assimetria de paginação

Como autor/reviewer/check filtram no servidor, "Load more" busca só PRs que já casam — comportamento correto e eficiente. Como agente filtra só no cliente, a contagem de itens visíveis após esse filtro pode ser menor que a página carregada; "Load more" continua disponível enquanto o servidor tiver mais páginas (`hasMore`), independentemente de quantos itens sobrarem depois do filtro de agente — mesmo comportamento que os filtros de estado/repositório já têm hoje.

### Reviewer: `reviewed-by:`, não `review-requested:`

Decisão confirmada com o usuário: filtrar por reviewer mostra PRs onde a pessoa **já revisou** (aprovou, pediu mudanças ou comentou como review), não PRs com revisão pendente. Revisão pendente fica para a etapa de Notificações.

### Trocar filtro de busca reinicia paginação

Mesmo mecanismo já implementado para `sort:` — o cache por repositório passa a guardar também os valores de autor/reviewer/check usados; se qualquer um mudar, a próxima busca é tratada como atualização completa (descarta cursor acumulado).

### Interface

Reaproveita o padrão de dropdown já usado por Ordenar/Repositório. Autor e reviewer usam um campo de texto (login do GitHub) dentro do dropdown, já que a lista de todos os colaboradores possíveis não está disponível localmente sem uma chamada extra. Check usa um seletor fixo (Passou/Falhou/Pendente). Agente usa uma lista fixa dos provedores conhecidos (Claude Code, Codex) mais "Sem agente". Filtros ativos aparecem como chips removíveis acima da lista, com uma ação para limpar todos.

## Risks / Trade-offs

- Autor/reviewer exigem digitar o login do GitHub exato (sem autocomplete nesta etapa) — aceito para manter o escopo simples; autocomplete ficaria para uma etapa futura se houver demanda.
- Filtro de agente pode exigir vários cliques em "Load more" para popular a lista visível em repositórios grandes com poucos PRs vinculados a agentes — trade-off aceito, mesmo já presente nos filtros locais existentes.

## Migration Plan

Não há migração de dados. Aditivo; em rollback, remover os controles e os parâmetros de filtro restaura o comportamento anterior.

## Open Questions

Nenhuma questão bloqueante.
