## 1. Backend e contrato

- [x] 1.1 Adicionar `author`/`reviewer`/`checkState` como qualificadores opcionais na query `search` (`author:`, `reviewed-by:`, `status:success|failure|pending`).
- [x] 1.2 Cache por repositório passa a guardar também os valores de filtro usados; qualquer mudança reinicia a paginação (mesmo mecanismo do `sort`).
- [x] 1.3 Expor `author`/`reviewer`/`checkState` como inputs opcionais no procedure `pullRequests.list`.

## 2. Interface

- [x] 2.1 Controles de autor/reviewer (campo de texto) e check (seletor fixo) na toolbar, reaproveitando o padrão de dropdown existente.
- [x] 2.2 Filtro de agente aplicado no cliente sobre `workspacesByPullRequest`, com opções para os provedores conhecidos e "Sem agente".
- [x] 2.3 Chips de filtro ativo acima da lista, cada um removível individualmente, mais uma ação para limpar todos.
- [x] 2.4 Persistir os filtros ativos localmente, mesmo padrão dos filtros existentes.

## 3. Acessibilidade

- [x] 3.1 Controles operáveis por teclado, com rótulos acessíveis e chips de filtro anunciados para leitores de tela.

## 4. Qualidade e verificação

- [x] 4.1 Testes unitários para a construção da string de busca com combinações de autor/reviewer/check/ordenação.
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 4.3 Validar manualmente: cada filtro isoladamente, combinação de vários, limpar filtros, e o filtro de agente interagindo com "Load more".
