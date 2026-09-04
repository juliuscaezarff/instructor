## 1. Backend e contrato

- [x] 1.1 Implementar `approvePullRequest` em `pull-requests.ts` usando `gh pr review --approve` (com `--body` opcional) via `execWithShellEnv`.
- [x] 1.2 Reaproveitar `classifyGitHubError` para classificar falhas (permissão, autenticação, CLI ausente, desconhecida).
- [x] 1.3 Expor `pullRequests.approve` como mutation no router tRPC, com input owner/repository/number/body opcional validado por zod.
- [x] 1.4 Invalidar os caches de detalhe e atividade (`detailCache`, `activityCache`) e a lista (`listCache`) do repositório após sucesso.

## 2. Interface

- [x] 2.1 Adicionar botão "Approve" no cabeçalho do detalhe de PR, visível apenas para PRs abertos/rascunho.
- [x] 2.2 Abrir diálogo de confirmação mostrando repositório/número/título antes do envio, com campo opcional de comentário.
- [x] 2.3 Desabilitar o envio durante a mutação, com trava síncrona contra reenvio.
- [x] 2.4 Exibir erro de permissão de forma distinta de falha genérica, preservando o texto digitado no diálogo.
- [x] 2.5 Ao suceder, fechar o diálogo, notificar sucesso e atualizar resumo/reviewers/lista com dados reais.

## 3. Acessibilidade

- [x] 3.1 Garantir navegação por teclado, foco visível e retorno de foco ao fechar o diálogo (mesmo padrão de `PullRequestAgentActions`: `onCloseAutoFocus` devolve foco ao botão que abriu).
- [x] 3.2 Anunciar estados de envio, sucesso e erro para leitores de tela (`role="alert"` no erro; estado de envio refletido pelo `disabled`/spinner do botão de confirmação).

## 4. Qualidade e verificação

- [x] 4.1 Testes unitários para a classificação de erro reutilizada (já cobertos em `pull-requests.test.ts`) e validação do limite do corpo opcional (`pull-request-review.test.js`).
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 4.3 Validar manualmente no Electron: aprovação bem-sucedida, autoaprovação rejeitada, falta de permissão, PR fechado/mesclado sem a ação, foco e leitor de tela.
