## Verification

### Automated

- `bun test src/main/lib/git/github/pull-requests.test.ts`: 13 testes passaram (1 novo: `buildPullRequestSearchQuery` combinando autor, reviewer, check state e ordenação em uma única string de busca).
- `bun test` (suíte completa): 45 testes passaram em 9 arquivos, nenhuma quebra.
- `bun run build`: build dos processos main, preload e renderer concluído sem erros.
- `bun x tsc --noEmit --pretty false`: 201 diagnósticos, mesma contagem do baseline, nenhum novo apontando para os arquivos alterados.

### Implemented flow

- Dropdown "Filters" (ícone `SlidersHorizontal`) estendido com: Repositórios (já existente), Author (campo de texto livre), Reviewer (campo de texto livre, semântica "já revisou por"), Check state (rádio: Any/Passing/Failing/Pending) e Agent (rádio: Any/Claude Code/OpenAI Codex/No linked agent).
- Author/Reviewer/Check state entram na query GraphQL `search` via `author:`, `reviewed-by:` e `status:` — mudar qualquer um reinicia a paginação do repositório, igual ao `sort` (mesmo `filters` object usado como chave de cache no backend e como chave da query tRPC no frontend).
- Agent é filtrado no cliente sobre `workspacesByPullRequest` (vínculo explícito PR↔workspace), sem heurística de conteúdo — não interfere em "Load more", que continua paginando pelo servidor independente de quantos itens carregados batem com o filtro de agente.
- Todos os quatro filtros persistem localmente (`atomWithStorage`), mesmo padrão dos filtros de estado/repositório existentes.
- Chips de filtro ativo (autor, reviewer, check state, agente) acima da lista, cada um removível individualmente via botão com `aria-label` descritivo; "Clear filters" reseta todos de uma vez, incluindo os novos.
- A região `role="status" aria-live="polite"` já existente (contagem de "N pull requests shown") cobre a leitura por leitor de tela ao ativar/remover qualquer filtro, sem necessidade de uma região adicional.

### Pending manual QA

Este ambiente não tem acesso a uma janela Electron interativa (app desktop, não abre no navegador). Falta validar visualmente:

1. Cada filtro isoladamente (author, reviewer, check state, agent) contra o repositório real.
2. Combinação de múltiplos filtros ao mesmo tempo.
3. "Clear filters" e remoção individual de cada chip.
4. Trocar author/reviewer/check state após "Load more" e confirmar que a lista reinicia do zero sob a nova combinação.
5. Filtro de agente ativo enquanto "Load more" segue disponível no servidor.
6. Navegação por teclado até os novos controles (inputs de texto e grupos de rádio) e leitura do estado ativo por leitor de tela.

Nenhum commit ou PR foi criado nesta implementação.
