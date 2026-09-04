## 1. Backend e contrato

- [x] 1.1 Implementar `createPullRequestComment` em `pull-requests.ts` usando `gh pr comment --repo <owner>/<repo> <number> --body <texto>` via `execWithShellEnv`.
- [x] 1.2 Validar tamanho do corpo antes de chamar o `gh`, retornando erro específico sem truncar.
- [x] 1.3 Adicionar classificação `gh_permission_denied` em `classifyGitHubError` (ou equivalente) com mensagens tolerantes a variação da CLI.
- [x] 1.4 Expor `pullRequests.comment` como mutation no router tRPC, com input owner/repository/number/body validado por zod.
- [x] 1.5 Invalidar cache de atividade (`activityCache`) da chave do PR após sucesso, sem fabricar o item localmente.

## 2. Interface

- [x] 2.1 Adicionar composer de comentário no contexto Resumo (revisado de Atividade para Resumo após teste manual, já que o cabeçalho persistente já mostra o destino do PR).
- [x] 2.2 Habilitar o botão "Comment" apenas com texto não vazio; desabilitar e mostrar spinner durante o envio, com trava síncrona (`busyRef`) contra reenvio.
- [x] 2.3 Preservar o texto do composer em caso de falha e exibir a mensagem de erro (permissão vs. genérico) sem apagar o rascunho.
- [x] 2.4 Ao suceder, disparar refetch da atividade, mostrar o novo comentário real e limpar o composer.
- [x] 2.5 Avisar antes do envio quando o texto exceder o limite aceito, sem cortar o conteúdo digitado.

## 3. Acessibilidade

- [x] 3.1 Garantir navegação por teclado, foco visível e rótulo acessível do campo e do botão de envio.
- [x] 3.2 Anunciar estados de envio, sucesso e erro para leitores de tela (`aria-live`/`role="status"`/`role="alert"`).

## 4. Qualidade e verificação

- [x] 4.1 Testes unitários para limite de tamanho e classificação de erro de permissão (`classifyGitHubError`, `isCommentBodyEmpty`).
- [x] 4.2 Avaliar teste de reenvio concorrente; o projeto não possui infraestrutura de testes de renderer (mesma lacuna registrada em `add-pull-request-center`), então a proteção do `busyRef` foi coberta por revisão de código e fica pendente de QA manual no Electron.
- [x] 4.3 Validar manualmente no Electron: envio bem-sucedido confirmado pelo usuário em PR real (comentário publicado e refletido na timeline). Falha de permissão, falha de rede, foco e leitor de tela não foram exercitados manualmente; comportamento coberto apenas por revisão de código.
- [x] 4.4 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
