## Verification

### Automated

- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 41 testes passaram em 9 arquivos, sem regressão. Nenhum teste novo foi necessário: `PullRequestStateError` reaproveita `classifyGitHubError`, já coberto.
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: mesma contagem de diagnósticos do baseline (201), nenhum novo apontando para os arquivos alterados.

### Implemented flow

- Botão "Reopen" no cabeçalho, visível apenas quando `item.state === "closed"` (PRs mesclados nunca oferecem a ação, já que o GitHub rejeitaria).
- Diálogo mostra repositório/número/título e um campo de comentário opcional.
- Envio via `gh pr reopen <number> --repo <owner>/<repo>` (`--comment <texto>` apenas se preenchido).
- Falha mantém o diálogo aberto com o comentário preservado; erro de permissão distinto de falha genérica.
- Sucesso fecha o diálogo, mostra toast e invalida `pullRequests.detail`, `pullRequests.activity` e `pullRequests.list`.
- `PullRequestStateError` criada de propósito com nome genérico (não `PullRequestReopenError`) para ser reaproveitada sem alteração pela próxima etapa (Fechar, `INS-19`), que usa o mesmo formato de comando (`gh pr close`).

### Pending manual QA

Diferente de Approve/Request Changes, esta ação **pode** ser testada de ponta a ponta no PR de teste próprio (`juliuscaezarff/instructor#9`) — fechar/reabrir não tem a restrição de autorrevisão do GitHub. Falta validar manualmente:

1. Fechar o PR de teste e reabri-lo pelo Instructor, com e sem comentário.
2. Confirmar que o botão não aparece em PR aberto/rascunho/mesclado.
3. Verificar navegação por teclado, foco devolvido ao botão, e leitura por leitor de tela.

Nenhum commit ou PR foi criado nesta implementação além dos já registrados no histórico do branch `feat/pull-request-actions`.
