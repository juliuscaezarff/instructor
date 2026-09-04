## Verification

### Automated

- `bun test src/main/lib/git/github src/shared src/renderer/features/pull-requests`: 41 testes passaram em 9 arquivos (2 novos: extração de run id a partir de URL válida/inválida/ausente).
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: mesma contagem de diagnósticos do baseline (201), nenhum novo apontando para os arquivos alterados.

### Investigation

Antes de implementar, confirmei via `gh pr checks --help` e `gh run rerun --help` que:
- `gh pr checks --json` expõe `bucket, completedAt, description, event, link, name, startedAt, state, workflow` — sem id de execução.
- `gh run rerun <run-id> --failed` reexecuta apenas os jobs que falharam de uma execução específica, preservando os que já passaram.
- O repositório de QA (`juliuscaezarff/instructor`) não tem nenhum check de CI configurado em nenhum PR existente (`statusCheckRollup` vazio em todos), confirmando a limitação de teste já registrada na proposta.

### Implemented flow

- Botão "Re-run failed checks" no cabeçalho, visível apenas quando `item.checks.failure > 0` em um PR aberto/rascunho.
- Diálogo lista separadamente os checks que serão reexecutados (têm URL de execução do GitHub Actions extraível) e os que não podem ser reexecutados pelo Instructor (CI externo), sem esconder nem fingir sucesso para os últimos.
- Confirmação desabilitada quando nenhum check com falha é suportado.
- Envio agrupa os checks com falha por run id único (evitando reexecutar a mesma execução mais de uma vez) e chama `gh run rerun <runId> --repo <owner>/<repo> --failed` para cada um.
- Resultado agregado: toast de sucesso quando tudo reexecuta, toast de aviso quando há reexecuções que falharam, sempre com contagem precisa de reexecutados/ignorados/falhos.
- Nenhuma outra mutação (comentar, aprovar, solicitar mudanças, merge, fechar, reabrir) é exposta por este fluxo.

### Pending manual QA

Este ambiente não tem acesso a um repositório com GitHub Actions configurado nem a uma janela Electron interativa. Falta validar manualmente, em um repositório real com checks:

1. Reexecução bem-sucedida de um ou mais checks com falha.
2. Sucesso parcial (uma execução reexecuta, outra falha por permissão ou por ter sido removida).
3. Checks de CI externo listados corretamente como não suportados.
4. Falta de permissão (`actions: write`) tratada com mensagem específica.
5. Navegação por teclado, foco e leitor de tela no diálogo.

Nenhum commit ou PR foi criado nesta implementação além dos já registrados no histórico do branch `feat/pull-request-actions`.
