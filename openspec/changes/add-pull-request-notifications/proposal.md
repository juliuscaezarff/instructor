# Change: notificar eventos relevantes de pull requests

## Why

Última etapa da fase "Produtividade" (Linear `INS-24`), depois de `add-pull-request-pagination`/`add-pull-request-sort`/`add-pull-request-filters`. Hoje só se fica sabendo que um PR foi mergeado, recebeu review ou teve check quebrado se abrir a aba Pull Requests e olhar a lista.

## What Changes

- Detectar 3 eventos comparando o snapshot anterior com o novo, sempre que a lista de PRs já é buscada (nenhuma chamada extra à API): PR virou **merged** ou **closed**; PR **recebeu review** (approved ou changes requested); **checks passaram a falhar**.
- Notificar só o que é "seu": eventos em PRs cujo `author` é o usuário atual (`getCurrentGitHubUser()`, já existente — mesmo mecanismo do bloqueio de auto-aprovação).
- Buscar a lista de PRs também em segundo plano, a cada alguns minutos, enquanto o app estiver aberto, independente da aba ativa — sem isso não há evento pra comparar quando o usuário não está olhando a aba Pull Requests, e a notificação perde o sentido. Reaproveita a mesma `listPullRequests` já usada pela aba. Só roda enquanto a preferência de notificações estiver ativada.
- Toast nativo do SO reaproveitando a infra de `useDesktopNotifications` (mesmo IPC `desktopApi.showNotification`, mesmas preferências `desktopNotificationsEnabledAtom`/`notifyWhenFocusedAtom` já usadas pelas notificações de agente — sem toggle novo dedicado a PRs).
- Clique no toast foca a janela e abre o PR direto na aba Pull Requests (pequena extensão do IPC: hoje o clique só foca a janela, não navega).
- Badge no ícone do app/taskbar (`desktopApi.setBadge`, hoje sem uso) com contador de eventos não vistos; zera ao abrir a aba Pull Requests.
- Sem persistência entre reinícios: o snapshot anterior vive só em memória enquanto o app roda; ao abrir o app, nenhuma notificação dispara pro que já existia antes — só pras mudanças detectadas depois.

## Non-Goals

- Review **solicitada** a você (`review-requested:`) — precisaria de uma chamada GraphQL extra; fica pra uma etapa futura se houver demanda.
- Painel/inbox de notificações dentro do app com histórico visível — só toast + badge efêmeros, conforme já excluído na descrição do `INS-24`.
- Cache persistente, histórico ou métricas de notificações — mesma exclusão explícita do ticket.
- Suporte a GitLab/Bitbucket — etapa futura de Plataforma.
- Toggle dedicado só pra notificações de PR — reaproveita a preferência global já existente de notificações desktop.

## Impact

- Affected specs: `pull-request-notifications` (nova capacidade).
- Affected code: `src/main/lib/git/github/pull-requests.ts` (função de diff entre snapshots), `src/main/windows/main.ts` + `src/preload/index.ts` (IPC de clique navegando pro PR), novo hook em `src/renderer/features/pull-requests/` (poll + notificação, reaproveitando `useDesktopNotifications`), `src/renderer/features/layout/agents-layout.tsx` (monta o poll em segundo plano, sobrevive à troca de aba).

## Approval

Proposta aprovada pelo usuário em 4 de setembro de 2026.
