## Verification

### Automated

- `bun test src/renderer/features/pull-requests/pull-request-notification-events.test.ts`: 10 testes novos passaram (merged, closed, review recebida, checks falhando, primeiro snapshot não notifica, PR de outra pessoa não notifica, estado já notificado não repete, mais de um evento no mesmo PR).
- `bun test` (suíte completa): 55 testes passaram em 10 arquivos, nenhuma quebra.
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: 202 diagnósticos (baseline de 201 + 1), o novo é `pull-request-notification-events.test.ts` não resolvendo os tipos de `bun:test` — mesmo padrão preexistente já aceito para `pull-requests.test.ts` (não é um erro de lógica introduzido por esta mudança). Nenhum outro diagnóstico novo nos arquivos alterados.

### Implemented flow

- `usePullRequestNotifications` (montado uma vez em `agents-layout.tsx`, sobrevive à troca de aba) busca `pullRequests.list` sem filtro a cada 3 minutos, só enquanto `desktopNotificationsEnabledAtom` estiver ativo — desativado, nenhum poll roda.
- A cada resultado novo, `diffPullRequestNotificationEvents` compara com o snapshot anterior (guardado em `useRef`, só em memória) e reporta merged/closed, review recebida (approved/changes requested) e checks passando a falhar — só para PRs onde `author` é o usuário atual (`pullRequests.currentUser`, já existente).
- Toast nativo via `useDesktopNotifications` (reaproveitado, sem toggle novo — mesmas preferências `desktopNotificationsEnabledAtom`/`notifyWhenFocusedAtom` das notificações de agente), agora carregando um `data` com `owner`/`repository`/`number`.
- Clique no toast: `showNotification` → IPC (`app:show-notification` com `data`) → processo principal foca a janela e manda o `data` de volta via `app:notification-clicked` → preload expõe `onNotificationClick` → o hook seta `desktopViewAtom` pra `"pull-requests"` e um novo átomo `pullRequestPendingSelectionAtom` com o PR alvo.
- `pull-requests-view.tsx` observa `pullRequestPendingSelectionAtom`: limpa os filtros ativos, força um refresh e seleciona o PR assim que ele aparece na lista buscada; desiste silenciosamente se não aparecer após uma busca sem filtro (evita loop infinito).
- Badge (`desktopApi.setBadge`) conta eventos não vistos enquanto a aba Pull Requests não está aberta; zera ao abrir a aba.
- Sem persistência: o snapshot vive só em `useRef`; reiniciar o app nunca gera notificação pro estado que já existia.

### Pending manual QA

Este ambiente não tem acesso a uma janela Electron interativa (app desktop, não abre no navegador). Falta validar visualmente:

1. Cada tipo de evento (merge, close, review, check falhando) disparando um toast real.
2. Clique no toast abrindo a janela, trocando pra aba Pull Requests e selecionando o PR certo.
3. Badge no ícone/taskbar incrementando com a aba fechada e zerando ao abrir.
4. Preferência de notificações desativada: nenhum poll, nenhum toast, nenhum badge.
5. `notifyWhenFocused` desativado (padrão): nenhum toast quando a janela está em foco; ativado, toast mesmo em foco.

Nenhum commit ou PR foi criado nesta implementação.
