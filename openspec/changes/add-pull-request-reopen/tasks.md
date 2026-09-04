## 1. Backend e contrato

- [x] 1.1 Implementar `reopenPullRequest` em `pull-requests.ts` usando `gh pr reopen --comment <texto opcional>` via `execWithShellEnv`.
- [x] 1.2 Criar `PullRequestStateError` (reutilizável por Fechar) e reaproveitar `classifyGitHubError`.
- [x] 1.3 Expor `pullRequests.reopen` como mutation no router tRPC, com `comment` opcional limitado por `MAX_COMMENT_BODY_CHARS`.
- [x] 1.4 Invalidar `detailCache`, `activityCache` e `listCache` do repositório após sucesso.

## 2. Interface

- [x] 2.1 Adicionar botão "Reopen" no cabeçalho do detalhe, visível apenas para PRs fechados.
- [x] 2.2 Diálogo de confirmação com destino do PR e campo de comentário opcional.
- [x] 2.3 Desabilitar o envio durante a mutação, com trava síncrona contra reenvio.
- [x] 2.4 Exibir erro de permissão de forma distinta de falha genérica, preservando o texto digitado.
- [x] 2.5 Ao suceder, fechar o diálogo, notificar sucesso e atualizar resumo/lista com dados reais.

## 3. Acessibilidade

- [x] 3.1 Garantir navegação por teclado, foco visível e retorno de foco ao fechar o diálogo (mesmo padrão de Approve/Request Changes).
- [x] 3.2 Anunciar estados de envio, sucesso e erro para leitores de tela.

## 4. Qualidade e verificação

- [x] 4.1 Testes unitários: nenhuma classificação nova é introduzida (reaproveita `classifyGitHubError`); sem lacuna de cobertura pendente.
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 4.3 Validar manualmente no Electron: reabertura bem-sucedida (com e sem comentário), falta de permissão, PR mesclado sem a ação, foco e leitor de tela.
