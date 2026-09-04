## Context

Esta é a primeira operação mutável no GitHub implementada pelo Instructor. Todas as consultas existentes (`pull-requests.ts`) são somente leitura via `gh pr view`/`gh pr list`/`gh api` GET. O padrão de confirmação explícita e estado de rascunho já existe parcialmente em `PullRequestAgentActions` (diálogo de escolha antes de agir, botão desabilitado durante requisição, foco preservado ao fechar).

## Goals / Non-Goals

- Goals:
  - Publicar um comentário de PR sem sair do Instructor, com confirmação clara do destino.
  - Nunca perder o texto digitado pelo usuário em caso de falha.
  - Nunca publicar duas vezes o mesmo comentário por clique duplo ou corrida de requisições.
  - Estabelecer o padrão de permissão/erro reutilizável pelas próximas operações mutáveis (aprovar, solicitar mudanças, merge, fechar, reabrir, repetir checks).
- Non-Goals:
  - Editar/excluir comentários.
  - Comentário inline em linhas de diff.
  - Qualquer outra mutação no GitHub além de publicar um comentário de PR.

## Decisions

### Comando e transporte

Usar `gh pr comment <number> --repo <owner>/<repo> --body <texto>`. `execWithShellEnv` já invoca via `execFile` (array de argumentos, sem shell), então não há risco de injeção de shell ao passar o corpo do comentário como argumento — a mesma garantia que as consultas existentes já têm.

Alternativa descartada: `gh api graphql` com mutation `addComment` exigiria resolver o `subjectId` (node id) do PR antes, adicionando uma chamada extra sem benefício sobre `gh pr comment`, que já retorna a URL do comentário criado em texto simples no stdout.

### Limite de tamanho

O limite de comentário do GitHub é 65536 caracteres. Diferente dos limites de leitura (que truncam conteúdo remoto silenciosamente porque é apenas exibição), aqui o conteúdo é autoral do usuário: exceder o limite bloqueia o envio com uma mensagem explícita antes de chamar o `gh`, nunca corta o texto sem avisar.

Argumentos de linha de comando têm limites por plataforma (por exemplo, ~32K caracteres efetivos por argumento no Windows em cenários combinados). Como o limite de comentário do GitHub já é maior que uma margem seguramente utilizável por um único argumento em todas as plataformas suportadas, este corte é feito no nível da aplicação (ex.: 60000 caracteres) para nunca depender do limite do SO. Caso medições futuras mostrem necessidade de corpos maiores, migrar para `--body-file` com arquivo temporário fica como alternativa, não implementada nesta etapa.

### Confirmação e envio explícito

O composer fica no contexto `Resumo` (o primeiro exibido ao abrir o PR), não em `Atividade`. Decisão revisada após teste manual: colocá-lo apenas na aba Atividade obrigava trocar de contexto para uma ação que deveria estar sempre à mão — o próprio GitHub mantém a caixa de comentário na aba principal (Conversation), não numa aba secundária. O cabeçalho do detalhe já mostra repositório, número e título do PR de forma persistente acima das abas, o que satisfaz o requisito de destino visível antes do envio sem repetir essa informação dentro do composer. O botão "Comment" só habilita com texto não vazio e fica desabilitado + com spinner durante o envio, usando o mesmo padrão de `busyRef` para impedir reenvio por clique duplo ou tecla Enter repetida.

Tecnicamente isso não conflita com o carregamento lazy de Atividade: o composer só depende da identidade do PR (sempre disponível) para publicar, e invalida a query de atividade após o sucesso independentemente de a aba já ter sido aberta.

Não há suporte nativo do GitHub para chave de idempotência em comentários via REST/`gh`; a proteção contra duplicidade é inteiramente client-side (desabilitar o controle enquanto a mutação está em voo). Isso é uma limitação conhecida e documentada, não um requisito de exatamente-uma-vez no servidor.

### Tratamento de erro e permissão

Reaproveitar o padrão de `classifyGitHubError`, adicionando uma categoria `gh_permission_denied` reconhecendo mensagens como "must have push access", "403", "not permitted", "Resource not accessible by integration". Erros de permissão exibem uma mensagem específica e acionável; qualquer outra falha usa mensagem genérica de tentar novamente. Em ambos os casos, o texto do rascunho permanece no campo — nenhuma falha limpa o composer.

### Atualização pós-sucesso

`gh pr comment` não retorna o objeto JSON completo do comentário (apenas a URL em texto). Em vez de fabricar um item de atividade localmente (author, avatar, timestamp), a mutação invalida a query `pullRequests.activity` para o PR e deixa o refetch trazer o dado real do GitHub, consistente com o requisito existente de "Safe read-only rendering" (não apresentar conteúdo fabricado). O composer mostra um estado de "publicado" transitório até o refetch concluir.

### Escopo de permissão desta etapa

Esta mutação autoriza apenas comentar. Nenhum outro botão ou fluxo desta etapa concede aprovação, merge, fechamento, reabertura ou nova execução de checks — cada uma dessas continua exigindo sua própria proposta OpenSpec aprovada, por decisão já registrada nas issues do Linear (`INS-17` a `INS-19`, `INS-21` a `INS-23`).

## Risks / Trade-offs

- Sem idempotência no servidor: um duplo clique que escape da trava client-side ainda publicaria duas vezes. Mitigação: `busyRef` síncrono (mesmo padrão já validado em `PullRequestAgentActions`) mais desabilitação do formulário inteiro durante o envio.
- `gh pr comment` pode variar mensagens de erro entre versões da CLI. Mitigação: classificação tolerante por substring, com fallback para mensagem genérica em vez de falhar a categorização.
- Corpo muito grande rejeitado no cliente antes do envio pode divergir ligeiramente do limite real do GitHub (que pode variar por tipo de conta). Mitigação: manter uma margem segura abaixo do limite documentado.

## Migration Plan

Não há migração de dados. Nova função e novo procedure são aditivos. Em rollback, remover o composer e o procedure não afeta a timeline de leitura existente.

## Open Questions

Nenhuma questão bloqueante.
