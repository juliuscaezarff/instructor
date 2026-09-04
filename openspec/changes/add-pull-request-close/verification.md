## Verification

### Automated

- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 41 testes passaram em 9 arquivos, sem regressão. Nenhum teste novo foi necessário: `closePullRequest` reaproveita `PullRequestStateError`/`classifyGitHubError`, já cobertos.
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: mesma contagem de diagnósticos do baseline (201), nenhum novo apontando para os arquivos alterados.

### Implemented flow

- Botão "Close" no cabeçalho, visível apenas quando `item.state` é `open` ou `draft`.
- Diálogo mostra repositório/número/título e um campo de comentário opcional; botão de confirmação em `variant="destructive"`, mesmo tratamento visual de Request Changes.
- Envio via `gh pr close <number> --repo <owner>/<repo>` (`--comment <texto>` apenas se preenchido).
- Falha mantém o diálogo aberto com o comentário preservado; erro de permissão distinto de falha genérica.
- Sucesso fecha o diálogo, mostra toast e invalida `pullRequests.detail`, `pullRequests.activity` e `pullRequests.list`.
- Reaproveita 100% a estrutura de `add-pull-request-reopen`: mesma classe de erro, mesmo padrão de diálogo, só troca o subcomando do `gh` e a condição de visibilidade.

### Manual QA

Assim como Reabrir, esta ação **pode** ser testada de ponta a ponta no PR de teste próprio (`juliuscaezarff/instructor#9`, hoje fechado). Falta validar manualmente:

1. Reabrir o PR de teste e fechá-lo de novo pelo Instructor, com e sem comentário.
2. Confirmar que o botão não aparece em PR já fechado/mesclado.
3. Verificar navegação por teclado, foco devolvido ao botão, e leitura por leitor de tela.

Nenhum commit ou PR foi criado nesta implementação além dos já registrados no histórico do branch `feat/pull-request-actions`.
