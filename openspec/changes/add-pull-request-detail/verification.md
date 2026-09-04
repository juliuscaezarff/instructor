## Verification

### Automated

- `bun test src/main/lib/git/github/pull-requests.test.ts`: 8 testes passaram.
- `bun run build`: build dos processos main, preload e renderer concluído.
- `git diff --check`: nenhuma falha de whitespace.
- `bun x tsc --noEmit --pretty false`: o baseline mantém diagnósticos preexistentes; nenhum diagnóstico apontou para os novos arquivos ou para o router alterado.

### Real GitHub data

Uma consulta somente leitura ao PR `juliuscaezarff/instructor#6` confirmou:

- 48 arquivos normalizados com status e estatísticas.
- 46 eventos de commit combinados na timeline.
- Patch do primeiro arquivo retornado isoladamente usando `per_page=1&page=1`.
- 64 linhas de patch aceitas sem truncamento.

### Pending visual check

O app foi iniciado em modo de desenvolvimento sem erros associados à feature. A inspeção final dos temas, redimensionamento e largura compacta permanece pendente antes de concluir o checklist OpenSpec.

### Revisão: Atividade incorporada ao Resumo

Após feedback de uso (comentar exigia trocar para a aba Atividade), o painel passou de 3 para 2 contextos: `Resumo` (metadados + timeline de Atividade em formato compacto, inspirado no Linear) e `Arquivos`. A consulta de atividade deixou de ser sob demanda por aba e passou a ser buscada junto com o resumo — trade-off aceito conscientemente para eliminar a fricção de comentar. `bun run build` e `bun test` (39 testes) confirmados após a mudança; `tsc --noEmit` sem diagnósticos novos.
