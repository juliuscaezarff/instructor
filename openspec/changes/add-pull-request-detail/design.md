## Context

O detalhe atual consulta `gh pr view` somente após uma seleção e mostra descrição, branches, mergeabilidade, reviewers e checks. Commits, atividade e patches podem ser muito maiores e não devem aumentar o custo da lista agregada nem o carregamento inicial do painel.

## Goals / Non-Goals

- Goals:
  - Inspecionar o conteúdo relevante de um PR sem sair do Instructor.
  - Manter o painel rápido mesmo em PRs ou repositórios grandes.
  - Isolar falhas: um diff indisponível não deve remover resumo ou atividade já carregados.
  - Preservar uma experiência densa, redimensionável e acessível.
- Non-Goals:
  - Editar dados do GitHub.
  - Reproduzir toda a interface de code review do GitHub.
  - Persistir patches ou timeline no SQLite.

## Decisions

### Contextos progressivos

O painel tem `Resumo` (metadados, descrição, checks e a timeline de Atividade) e `Arquivos`. Resumo é o contexto padrão e único ponto de leitura+escrita de atividade — commits, comentários e reviews são consultados junto com o resumo, seguindo o padrão de densidade do Linear (timeline compacta terminando no composer de comentário, sem exigir trocar de aba para responder). A lista de arquivos não inclui patches; o patch é carregado apenas para o arquivo selecionado.

Decisão revisada após feedback de uso: a separação inicial de Atividade em aba própria criava fricção para comentar (era preciso trocar de contexto para uma ação de uso frequente). Arquivos continua isolado porque, ao contrário de Atividade, seu custo (patches por arquivo) é proporcional ao tamanho do PR e não à quantidade de eventos, e patches não fazem sentido no fluxo de leitura do resumo.

### Consultas locais somente leitura

Metadados compatíveis serão obtidos por `gh pr view --json`. Dados não expostos de forma suficiente pelo comando poderão usar `gh api graphql`, sempre com queries somente leitura e a mesma autenticação local já utilizada pela central.

O diff será consultado separadamente e normalizado para um contrato interno. O renderer não executará comandos nem interpretará HTML remoto.

### Limites e cache

- Cache curto e independente por PR, seção e arquivo.
- Timeout por comando, sem bloquear dados já apresentados.
- Limite explícito para eventos e commits, com indicação quando houver mais conteúdo.
- Limite de bytes/linhas por patch; conteúdo excedente será marcado como truncado.
- Nenhum prefetch de patches ao apenas rolar a lista de arquivos.
- Virtualização somente quando o volume medido justificar, evitando complexidade no caminho comum.

### Visualização do diff

O primeiro corte usa diff unificado por arquivo, adequado ao painel estreito e ao padrão compacto do app. Linhas preservam números antigos/novos, tipo de alteração e conteúdo selecionável. Arquivos binários ou patches ausentes recebem um estado textual neutro.

Uma visualização side-by-side fica fora do primeiro corte porque reduz a legibilidade no painel redimensionável e aumenta significativamente a complexidade.

### Atividade

A timeline combina commits, comentários e reviews em ordem cronológica, mantendo autor, avatar, horário, tipo e conteúdo. Eventos usam ícone e texto; cor não será o único indicador. Conteúdo Markdown seguirá o renderer seguro já usado no resumo.

## Risks / Trade-offs

- Patches grandes podem consumir memória e degradar renderização. Mitigação: lazy loading, limites, truncamento explícito e virtualização orientada por medição.
- A saída disponível no `gh` pode variar entre tipos de evento. Mitigação: schemas tolerantes para campos opcionais e contratos internos estáveis.
- Timeline REST/GraphQL pode não reproduzir todos os eventos do GitHub. Mitigação: escopo explícito para commits, comentários e reviews, mantendo o link canônico.
- Cache curto pode mostrar dados ligeiramente antigos. Mitigação: atualização manual e invalidação coerente ao trocar de PR.

## Migration Plan

Não há migração de dados. As novas consultas e contextos são incrementais. Em rollback, remover as novas procedures e contextos restaura o detalhe inicial sem afetar a listagem.

## Open Questions

- Nenhuma questão bloqueante. Limites iniciais definidos em 300 arquivos, 200 itens de atividade, 50.000 caracteres por corpo e patches de até 500 KB ou 5.000 linhas.
