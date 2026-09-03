# Change: adicionar detalhes completos de pull requests

## Why

A central inicial permite acompanhar estado, review e checks, mas ainda exige abrir o GitHub para entender o conteúdo real de um pull request. A próxima etapa deve tornar commits, atividade e alterações de código consultáveis dentro do Instructor sem introduzir operações mutáveis.

## What Changes

- Evoluir o painel selecionado com contextos compactos de `Resumo`, `Arquivos` e `Atividade`.
- Exibir commits, comentários, reviews e eventos relevantes em uma timeline somente leitura.
- Listar arquivos alterados com estatísticas e carregar o diff apenas quando necessário.
- Permitir navegar entre arquivos e trechos do diff por teclado, preservando foco e posição.
- Manter consultas pesadas lazy, cache curto, limites explícitos e estados próprios de loading, vazio e erro.
- Preservar a ação de abrir o PR canônico no GitHub como escape hatch.

## Non-Goals

- Comentar, aprovar, solicitar mudanças, fazer merge, fechar ou reabrir pull requests.
- Executar novamente checks ou alterar branches.
- Criar automaticamente um workspace ou iniciar um agente a partir do PR.
- Gerar review ou resumo por IA nesta mudança.
- Adicionar GitLab ou Bitbucket.

## Future Follow-ups

Depois desta mudança, a evolução prevista é:

1. Integração com agentes: criar ou abrir workspace, iniciar análise/correção e relacionar claramente o agente que trabalhou no PR.
2. Operações no GitHub: comentar, aprovar, solicitar mudanças, mesclar, fechar, reabrir e repetir checks.
3. Produtividade: paginação além dos 50 PRs por repositório, ordenação, filtros por autor/reviewer/check/agente e notificações.
4. Plataforma: cache persistente, histórico/métricas e suporte a GitLab e Bitbucket.

Cada grupo deverá ser proposto separadamente para manter permissões, risco e escopo explícitos.

## Impact

- Affected specs: `pull-request-detail` (nova capacidade sobre a central existente).
- Affected code: serviço GitHub em `src/main/lib/git/github`, router tRPC de pull requests e componentes em `src/renderer/features/pull-requests`.
- Reutiliza `gh` CLI, React Query, tRPC, virtualização, Markdown e o sistema visual existente.
- Sem alteração de banco, nova dependência de produção ou permissão mutável no GitHub.

## Approval

Aguardando aprovação antes da implementação.
