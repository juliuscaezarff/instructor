## 1. Backend e contrato

- [x] 1.1 Estender `getPullRequestDetail` para incluir `mergeStateStatus`.
- [x] 1.2 Implementar `getPullRequestMergeOptions` buscando `allow_merge_commit`/`allow_squash_merge`/`allow_rebase_merge` via `gh api repos/<owner>/<repo>`.
- [x] 1.3 Implementar `mergePullRequest` em `pull-requests.ts` usando `gh pr merge --merge|--squash|--rebase` via `execWithShellEnv`, nunca `--admin` nem `--delete-branch`, reaproveitando `PullRequestStateError`.
- [x] 1.4 Expor `pullRequests.mergeOptions` (query) e `pullRequests.merge` (mutation) no router tRPC.
- [x] 1.5 Invalidar `detailCache`, `activityCache` e `listCache` do repositório após sucesso.

## 2. Interface

- [x] 2.1 Adicionar botão "Merge" no cabeçalho do detalhe, visível apenas para PRs `state === "open"` (exclui rascunho).
- [x] 2.2 Ao abrir o diálogo, buscar métodos permitidos sob demanda; exigir escolha explícita quando houver mais de um.
- [x] 2.3 Desabilitar a confirmação com explicação quando `mergeStateStatus` for `DIRTY` ou `BLOCKED`.
- [x] 2.4 Diálogo mostra destino do PR, método selecionado e aviso de irreversibilidade antes do envio.
- [x] 2.5 Desabilitar o envio durante a mutação, com trava síncrona contra reenvio.
- [x] 2.6 Exibir erro de permissão de forma distinta de falha genérica.
- [x] 2.7 Ao suceder, fechar o diálogo, notificar sucesso e atualizar resumo/lista com dados reais.

## 3. Acessibilidade

- [x] 3.1 Garantir navegação por teclado, foco visível e retorno de foco ao fechar o diálogo; grupo de método usa `role="radiogroup"`.
- [x] 3.2 Anunciar estados de envio, sucesso, bloqueio e erro para leitores de tela (`role="alert"` nos avisos/erros).

## 4. Qualidade e verificação

- [x] 4.1 Avaliar cobertura de teste unitário: o mapeamento de `mergeStateStatus` para mensagem de bloqueio e a derivação dos métodos permitidos são lookups/filtros triviais (mesmo nível de `STATE_COPY`/`REVIEW_COPY`, já existentes e não testados unitariamente); verificados por revisão de código em vez de teste dedicado.
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 4.3 Validar manualmente em um repositório com branch protection configurada (não disponível neste ambiente): merge bloqueado por `BLOCKED`/`DIRTY`, escolha de método único vs. múltiplo, falta de permissão.
