## Verification

### Automated

- `bun test src/main/lib/git/github/pull-requests.test.ts src/shared/pull-request-comment.test.js`: 11 testes passaram (4 novos: classificação de erro de permissão/autenticação/CLI ausente/desconhecido, validação de corpo vazio/whitespace, limite positivo).
- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 38 testes passaram em 7 arquivos, sem regressão nas suítes existentes de pull requests.
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: baseline mantém diagnósticos preexistentes (incluindo o já conhecido `bun:test` sem tipos em `pull-requests.test.ts`); nenhum diagnóstico novo aponta para `pull-requests.ts`, o router de pull requests, `pull-request-detail-tabs.tsx` ou `shared/pull-request-comment.ts`.
- `git diff --check`: nenhuma falha de whitespace.

### Implemented flow

- Novo composer no contexto Resumo do detalhe de PR (revisado de Atividade para Resumo após feedback de teste manual — o GitHub também mantém a caixa de comentário na aba principal, não numa secundária). O destino (repositório, número, título) já é visível no cabeçalho persistente do detalhe, acima das abas.
- Envio via `gh pr comment <number> --repo <owner>/<repo> --body <texto>` (`execFile`, sem shell — mesma garantia de segurança das consultas existentes).
- Botão "Comment" desabilitado sem texto ou durante envio; trava síncrona (`busyRef`) impede reenvio por clique duplo/Enter repetido além do próprio `disabled` do botão.
- Falha preserva o rascunho digitado; erro de permissão (`gh_permission_denied`, mapeado para `FORBIDDEN` no tRPC) mostra mensagem distinta de falha genérica.
- Sucesso invalida a query `pullRequests.activity` (e o cache curto no processo main) para buscar o comentário real do GitHub, sem fabricar conteúdo local; o composer só é limpo após o sucesso da mutação.
- Corpo limitado a `MAX_COMMENT_BODY_CHARS` (60.000 caracteres, com margem sob o limite de 65.536 do GitHub); excedente bloqueia o envio com contagem visível, sem cortar o texto do usuário.
- Nenhuma outra mutação (aprovar, merge, fechar, reabrir, repetir checks) é exposta por este fluxo.

### Manual Electron QA

Confirmado pelo usuário em uso real: publicar um comentário funcionou (comentário criado no GitHub e refletido na timeline).

Ainda não exercitado manualmente:

1. Falha de permissão em um PR sem acesso de escrita (mensagem específica).
2. Falha de rede/CLI (ex.: desconectar) e confirmar que o rascunho permanece no campo.
3. Navegação por teclado (Tab até o campo e o botão, foco visível) e leitura por leitor de tela dos estados de envio/sucesso/erro.
4. Clique duplo ou Enter repetido no botão não publica o comentário duas vezes.
5. Temas claro/escuro e largura estreita do painel.

Nenhum commit ou PR foi criado nesta implementação. Alterações de outras features e do `.claude` foram preservadas.
