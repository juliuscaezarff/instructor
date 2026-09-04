## Verification

### Automated

- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 39 testes passaram em 8 arquivos, sem regressão. Nenhum teste novo foi necessário: a validação de corpo obrigatório vive no schema zod do router (reaproveitando `MAX_REVIEW_BODY_CHARS`, já testado) e a classificação de erro reaproveita `classifyGitHubError`, já coberto em `pull-requests.test.ts`.
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: mesma contagem de diagnósticos do baseline (201), nenhum novo apontando para os arquivos alterados.

### Implemented flow

- Botão "Request changes" no cabeçalho do detalhe, ao lado de Approve, renderizado apenas quando `item.state` é `open` ou `draft`.
- Diálogo mostra repositório/número/título e um campo de justificativa **obrigatório** — o botão de confirmação só habilita com texto não vazio, diferente de Approve (onde o comentário é opcional).
- Envio via `gh pr review <number> --repo <owner>/<repo> --request-changes --body <texto>`.
- Falha mantém o diálogo aberto com a justificativa preservada; erro de permissão (`FORBIDDEN`) mostra mensagem distinta; qualquer outra rejeição do GitHub mostra o texto retornado pela CLI.
- Sucesso fecha o diálogo, mostra toast e invalida `pullRequests.detail`, `pullRequests.activity` e `pullRequests.list`.
- Nenhuma outra mutação (aprovar, merge, fechar, reabrir, repetir checks) é exposta por este fluxo.

### Pending manual Electron QA

Este ambiente não tem acesso interativo ao Electron. Falta validar manualmente:

1. Solicitar mudanças em um PR de teste com justificativa e confirmar que resumo/reviewers/lista atualizam com o estado real do GitHub.
2. Confirmar que o botão de confirmação permanece desabilitado sem texto no campo.
3. Testar falha de permissão em um PR sem acesso e confirmar a mensagem específica.
4. Confirmar que a ação não aparece para PRs fechados/mesclados.
5. Verificar navegação por teclado, foco devolvido ao botão ao fechar o diálogo, e leitura por leitor de tela.

Nenhum commit ou PR foi criado nesta implementação além dos já registrados no histórico do branch `feat/pull-request-actions`.
