# Change: aprovar pull requests diretamente pelo Instructor

## Why

Comentar em PRs (`add-pull-request-comments`) estabeleceu o padrão de mutação explícita/confirmada no GitHub. Esta é a segunda etapa da fase "Realizar ações no GitHub diretamente pelo Instructor" (Linear `INS-21`): permitir enviar uma aprovação de revisão sem sair do Instructor.

## What Changes

- Adicionar uma ação "Approve" no cabeçalho do detalhe de PR, ao lado da ação de chat existente.
- Abrir um diálogo de confirmação mostrando repositório, número e título do PR antes de qualquer envio, com campo opcional de comentário de aprovação.
- Enviar a aprovação apenas mediante confirmação explícita no diálogo.
- Validar permissões/restrições devolvidas pelo GitHub (ex.: usuário não pode aprovar o próprio PR, falta de permissão) com mensagens específicas e acionáveis.
- Após o resultado, atualizar o estado de revisão exibido (resumo, lista de reviewers, lista agregada) sem fabricar dados locais.
- Disponibilizar a ação apenas para PRs abertos ou em rascunho; PRs mesclados ou fechados não oferecem a ação.

## Non-Goals

- Solicitar mudanças, comentar sem aprovar, mesclar, fechar, reabrir ou repetir checks (etapas próprias, propostas separadamente).
- Aprovação em lote de múltiplos PRs.
- Revisão inline em linhas de diff; o comentário de aprovação é de nível de PR, como a revisão do GitHub permite.
- Detectar antecipadamente, no cliente, se o usuário autenticado é o autor do PR; esse caso é reportado pelo erro retornado pelo GitHub.

## Impact

- Affected specs: `pull-request-approval` (nova capacidade).
- Affected code: `src/main/lib/git/github/pull-requests.ts` (nova função de mutação), `src/main/lib/trpc/routers/pull-requests.ts` (novo procedure), novo componente `src/renderer/features/pull-requests/pull-request-approve-action.tsx`, `src/renderer/features/pull-requests/pull-requests-view.tsx` (novo botão no cabeçalho).
- Reutiliza `gh` CLI via `execWithShellEnv`, o padrão de diálogo de confirmação já usado em `PullRequestAgentActions`, React Query e o sistema visual atual.
- Sem alteração de schema do SQLite, sem nova dependência de produção.

## Approval

Proposta aprovada pelo usuário em 3 de setembro de 2026.
