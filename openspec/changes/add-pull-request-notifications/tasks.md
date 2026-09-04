## 1. IPC (clique no toast)

- [x] 1.1 Estender `desktopApi.showNotification` pra aceitar um `data` opcional com `owner`/`repository`/`number`.
- [x] 1.2 Main process: guardar o `data` da notificação e mandar de volta pro renderer no clique via um novo canal (`app:notification-clicked`).
- [x] 1.3 Preload: expor um listener (`onNotificationClick`) pro renderer se inscrever.

## 2. Frontend

- [x] 2.1 Criar hook `usePullRequestNotifications` com poll (`refetchInterval`), snapshot em `useRef`, diff por PR (merged/closed, review recebida, checks falhando), filtrando só PRs do usuário atual.
- [x] 2.2 Disparar toast via `useDesktopNotifications` (reaproveitado) com o `data` de navegação.
- [x] 2.3 Badge no ícone/taskbar com contador de eventos não vistos; zera ao abrir a aba Pull Requests.
- [x] 2.4 Ouvir clique no toast e navegar pro PR certo (aba + seleção).
- [x] 2.5 Montar o hook em `agents-layout.tsx`.

## 3. Qualidade e verificação

- [x] 3.1 Testes unitários pra função de diff (merged/closed, review recebida, checks falhando, casos que não devem notificar, primeiro snapshot não gera notificação).
- [x] 3.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 3.3 Validar manualmente: evento de cada tipo, clique no toast abrindo o PR certo, badge zerando ao abrir a aba, preferência desativada não gera poll nem toast.
