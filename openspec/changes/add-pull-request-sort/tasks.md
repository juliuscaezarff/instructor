## 1. Backend e contrato

- [x] 1.1 Parametrizar o `sort:` da query `search` em `fetchPullRequestSearchPage`/`listRepositoryPullRequests` (`updated_desc` | `created_desc` | `created_asc`).
- [x] 1.2 Trocar de critério reinicia a paginação do repositório (descarta cursor/itens acumulados, busca primeira página do novo critério).
- [x] 1.3 Expor `sort` como input no procedure `pullRequests.list`, default `updated_desc`.

## 2. Interface

- [x] 2.1 Adicionar átomo Jotai persistido para a preferência de ordenação.
- [x] 2.2 Controle de ordenação na toolbar (dropdown com grupo de rádio), mostrando o critério ativo no `aria-label`/tooltip.
- [x] 2.3 Trocar o critério reinicia a lista visível e a paginação (via chave da query tRPC), preservando filtros de estado/repositório/busca já ativos (client-side, independentes da busca no servidor).

## 3. Acessibilidade

- [x] 3.1 Controle operável por teclado (`DropdownMenuRadioGroup`/`DropdownMenuRadioItem` já acessíveis via Radix), com foco visível e nome acessível do critério ativo.

## 4. Qualidade e verificação

- [x] 4.1 Teste unitário para o mapeamento de cada critério ao qualificador `sort:` correspondente, garantindo 3 valores distintos.
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 4.3 Validar manualmente no Electron: trocar critério, confirmar reordenação visual e que "Load more" continua consistente com o novo critério.
