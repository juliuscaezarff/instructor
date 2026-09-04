## Verification

### Automated

- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 39 testes passaram em 8 arquivos (1 novo: limite positivo de `MAX_REVIEW_BODY_CHARS`); a classificação de erro (`gh_permission_denied` etc.) é a mesma reutilizada por `add-pull-request-comments` e já coberta em `pull-requests.test.ts`.
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: mesma contagem de diagnósticos do baseline (201), nenhum novo apontando para `pull-requests.ts`, o router, `pull-request-approve-action.tsx`, `pull-requests-view.tsx` ou `shared/pull-request-review.ts`.
- `git diff --check`: nenhuma falha de whitespace.

### Implemented flow

- Botão "Approve" no cabeçalho do detalhe (ao lado da ação de chat existente), renderizado apenas quando `item.state` é `open` ou `draft`.
- Abre um diálogo (mesmo componente `Dialog` usado por `PullRequestAgentActions`) mostrando repositório, número e título do PR, com campo opcional de comentário e contador de caracteres.
- Envio via `gh pr review <number> --repo <owner>/<repo> --approve` (`--body` só quando o usuário digitar algo), usando `execFile` sem shell.
- Falha (permissão, autoaprovação, CLI ausente etc.) mantém o diálogo aberto com o comentário preservado; erro de permissão (`FORBIDDEN`) mostra mensagem distinta; qualquer outra rejeição do GitHub mostra o texto retornado pela CLI sem inventar uma causa.
- Sucesso fecha o diálogo, mostra um toast e invalida `pullRequests.detail`, `pullRequests.activity` e `pullRequests.list` para refletir o novo estado de revisão com dados reais do GitHub (nenhum dado fabricado localmente).
- Nenhuma outra mutação (solicitar mudanças, merge, fechar, reabrir, repetir checks) é exposta por este fluxo.

### Pending manual Electron QA

Este ambiente não tem acesso interativo ao Electron. Falta validar manualmente:

1. Aprovar um PR de teste com e sem comentário e confirmar que resumo/reviewers/lista atualizam com o estado real do GitHub.
2. Tentar aprovar o próprio PR e confirmar que a mensagem de rejeição do GitHub é exibida sem quebrar o diálogo.
3. Testar falha de permissão em um PR sem acesso e confirmar a mensagem específica.
4. Confirmar que a ação não aparece para PRs fechados/mesclados.
5. Verificar navegação por teclado, foco devolvido ao botão ao fechar o diálogo, e leitura por leitor de tela dos estados.
6. Verificar temas claro/escuro e largura estreita do painel.

Nenhum commit ou PR foi criado nesta implementação. Alterações de outras features e do `.claude` foram preservadas.
