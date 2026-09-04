## Context

Fase final de Produtividade. Reaproveita: `useDesktopNotifications` (toast), `desktopNotificationsEnabledAtom`/`notifyWhenFocusedAtom` (preferências já existentes, generalistas — não específicas de agente apesar do comentário no código), `getCurrentGitHubUser` (usuário atual), `listPullRequests` (busca por repositório, já usada pela aba).

## Goals / Non-Goals

- Goals: notificar sem chamada extra à API além do fetch que já existia; sem infra nova de persistência; reaproveitar toast/badge/IPC existentes; poll em segundo plano só quando notificações estão ativadas.
- Non-Goals: granularidade de preferência por tipo de evento; histórico visível; `review-requested:`.

## Decisions

### Onde mora o diff

No frontend, dentro de um hook dedicado (`usePullRequestNotifications`), montado uma única vez em `agents-layout.tsx` — não dentro de `pull-requests-view.tsx`, que desmonta ao trocar de aba. O hook chama `trpc.pullRequests.list` com seu próprio `refetchInterval`, guarda o último snapshot num `useRef<Map<string, PullRequestSummary>>`, e ao chegar um novo compara item a item por `key`: `state` mudou pra `merged`/`closed`, `reviewState` mudou pra `approved`/`changes_requested`, `checks.failure` foi de `0` pra `>0` — só considerando PRs onde `author === currentUser.login`.

Alternativa considerada: diff no backend, dentro de `listPullRequests`, retornando `events` junto da lista. Descartada porque o backend já faz cache por repositório com granularidade de filtro/sort — cada combinação teria seu próprio "snapshot anterior", multiplicando estados sem necessidade; o frontend é o único consumidor e só precisa de um snapshot "sem filtro" pra notificação.

### Poll em segundo plano

Intervalo fixo de 3 minutos (`refetchInterval: 180_000`), habilitado só enquanto `desktopNotificationsEnabledAtom` for `true`; desativado, nenhum poll extra roda (a aba Pull Requests continua funcionando do jeito que já funciona hoje, sob demanda, sem esse hook). Usa os repositórios já configurados nos projetos locais, sem filtro/ordenação — busca "crua", só pra detectar mudança de estado; não precisa refletir os filtros/ordenação que o usuário tem ativos na aba, já que o único propósito aqui é notificar, não popular a lista visível.

### Clique no toast navega pro PR

Extensão pequena: `showNotification` passa a aceitar um `data` opcional (`{ owner, repository, number }`). No clique, o processo principal manda esse dado de volta pro renderer via um novo canal (`app:notification-clicked`), que o hook escuta via um listener exposto no preload (`onNotificationClick`) e usa pra: focar a janela (comportamento já existente), trocar pra aba Pull Requests e selecionar o PR (reaproveita o mesmo mecanismo de seleção já usado pela navegação existente em `pull-requests-view.tsx`).

### Badge

Contador de eventos não vistos desde a última vez que a aba Pull Requests foi aberta, mantido como estado simples no mesmo hook; chama `desktopApi.setBadge(count)`. Zera quando a view de Pull Requests fica ativa.

## Risks / Trade-offs

- Poll a cada 3 minutos consome mais chamadas `gh api graphql` mesmo com o app em segundo plano — aceito, mesmo padrão de qualquer ferramenta de notificação; desligável pela preferência já existente (zero custo extra quando desativado).
- Diff só em memória: se o app for fechado e reaberto rápido o suficiente pra perder um evento (ex: PR mergeado e fechado antes do próximo poll), a notificação não dispara — aceito, é o comportamento esperado de "sem histórico persistente" já definido no ticket.

## Migration Plan

Aditivo; sem migração de dados. Rollback remove o hook de poll e a extensão de IPC, sem afetar o resto da aba Pull Requests.

## Open Questions

Nenhuma questão bloqueante.
