# Change: comentar em pull requests diretamente pelo Instructor

## Why

A central e o detalhe de PR já exibem comentários existentes na timeline de Atividade, mas o usuário ainda precisa abrir o GitHub para responder. Esta é a primeira etapa da fase "Realizar ações no GitHub diretamente pelo Instructor" (Linear `INS-20`), a operação de menor risco entre as mutações mapeadas, e serve de base de permissão/confirmação para as próximas (aprovar, solicitar mudanças, repetir checks, reabrir, fechar, merge).

## What Changes

- Adicionar um composer de comentário no contexto `Resumo` do detalhe de PR, com o destino (repositório/número/título) sempre visível no cabeçalho persistente antes do envio.
- Publicar o comentário apenas mediante ação explícita do usuário (botão "Comment"), nunca automaticamente.
- Preservar o rascunho digitado quando a publicação falhar, com erro claro e ação para tentar novamente.
- Impedir publicações duplicadas por clique duplo ou reenvio durante uma requisição em andamento.
- Após sucesso, atualizar a timeline de Atividade com os dados reais retornados pelo GitHub (sem fabricar conteúdo local) e limpar o composer.
- Tratar erro de permissão (usuário sem acesso para comentar) de forma distinta de falha genérica de rede/CLI.
- Limitar o tamanho do comentário ao aceito pelo GitHub, avisando antes do envio em vez de truncar silenciosamente conteúdo autoral do usuário.

## Non-Goals

- Aprovar, solicitar mudanças, mesclar, fechar, reabrir ou repetir checks (etapas próprias, propostas separadamente).
- Editar ou excluir um comentário já publicado.
- Comentar em linhas específicas do diff (comentário de revisão inline); esta etapa cobre apenas comentário de nível de PR (issue comment), como já normalizado na timeline de Atividade.
- Notificações, menções assistidas ou sugestões de conteúdo geradas por IA.

## Impact

- Affected specs: `pull-request-comments` (nova capacidade).
- Affected code: `src/main/lib/git/github/pull-requests.ts` (nova função de mutação), `src/main/lib/trpc/routers/pull-requests.ts` (novo procedure), novo componente `src/renderer/features/pull-requests/pull-request-comment-composer.tsx`, renderizado no contexto Resumo em `src/renderer/features/pull-requests/pull-requests-view.tsx`.
- Reutiliza `gh` CLI via `execWithShellEnv` (sem shell, argumentos por array), autenticação local existente, React Query e o sistema visual atual.
- Primeira mutação no GitHub introduzida pelo Instructor: sem alteração de schema do SQLite, sem nova dependência de produção.

## Approval

Proposta aprovada pelo usuário em 3 de setembro de 2026.
