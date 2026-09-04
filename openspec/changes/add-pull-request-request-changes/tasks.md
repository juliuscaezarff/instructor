## 1. Backend e contrato

- [x] 1.1 Implementar `requestChangesOnPullRequest` em `pull-requests.ts` usando `gh pr review --request-changes --body <texto>` via `execWithShellEnv`.
- [x] 1.2 Reaproveitar `classifyGitHubError` para classificar falhas.
- [x] 1.3 Expor `pullRequests.requestChanges` como mutation no router tRPC, com `body` obrigatório (`min(1)`) e limitado por `MAX_REVIEW_BODY_CHARS`.
- [x] 1.4 Invalidar `detailCache`, `activityCache` e `listCache` do repositório após sucesso.

## 2. Interface

- [x] 2.1 Adicionar botão "Request changes" no cabeçalho do detalhe de PR, visível apenas para PRs abertos/rascunho.
- [x] 2.2 Abrir diálogo de confirmação com repositório/número/título e campo de justificativa obrigatório; botão de envio desabilitado enquanto vazio.
- [x] 2.3 Desabilitar o envio durante a mutação, com trava síncrona contra reenvio.
- [x] 2.4 Exibir erro de permissão de forma distinta de falha genérica, preservando o texto digitado.
- [x] 2.5 Ao suceder, fechar o diálogo, notificar sucesso e atualizar resumo/reviewers/lista com dados reais.

## 3. Acessibilidade

- [x] 3.1 Garantir navegação por teclado, foco visível e retorno de foco ao fechar o diálogo (mesmo padrão de `PullRequestApproveAction`).
- [x] 3.2 Anunciar estados de envio, sucesso e erro para leitores de tela (`role="alert"` no erro).

## 4. Qualidade e verificação

- [x] 4.1 Testes unitários: nenhuma classificação nova foi introduzida (reaproveita `classifyGitHubError` e `MAX_REVIEW_BODY_CHARS`, já cobertos por `add-pull-request-approval`); sem lacuna de cobertura pendente.
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 4.3 Validar manualmente no Electron: solicitação bem-sucedida, tentativa de envio sem justificativa, falta de permissão, PR fechado/mesclado sem a ação, foco e leitor de tela.
