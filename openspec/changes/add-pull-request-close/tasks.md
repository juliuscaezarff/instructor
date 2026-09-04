## 1. Backend e contrato

- [x] 1.1 Implementar `closePullRequest` em `pull-requests.ts` usando `gh pr close --comment <texto opcional>` via `execWithShellEnv`, reaproveitando `PullRequestStateError`.
- [x] 1.2 Expor `pullRequests.close` como mutation no router tRPC, com `comment` opcional limitado por `MAX_COMMENT_BODY_CHARS`.
- [x] 1.3 Invalidar `detailCache`, `activityCache` e `listCache` do repositório após sucesso.

## 2. Interface

- [x] 2.1 Adicionar botão "Close" no cabeçalho do detalhe, visível apenas para PRs abertos/rascunho.
- [x] 2.2 Diálogo de confirmação com destino do PR e campo de comentário opcional.
- [x] 2.3 Desabilitar o envio durante a mutação, com trava síncrona contra reenvio.
- [x] 2.4 Exibir erro de permissão de forma distinta de falha genérica, preservando o texto digitado.
- [x] 2.5 Ao suceder, fechar o diálogo, notificar sucesso e atualizar resumo/lista com dados reais.

## 3. Acessibilidade

- [x] 3.1 Garantir navegação por teclado, foco visível e retorno de foco ao fechar o diálogo.
- [x] 3.2 Anunciar estados de envio, sucesso e erro para leitores de tela.

## 4. Qualidade e verificação

- [x] 4.1 Testes unitários: nenhuma classificação nova é introduzida; sem lacuna de cobertura pendente.
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 4.3 Validar manualmente no Electron: fechamento bem-sucedido (com e sem comentário), falta de permissão, PR já fechado/mesclado sem a ação, foco e leitor de tela.
