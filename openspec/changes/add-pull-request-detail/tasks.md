## 1. Contratos e acesso ao GitHub

- [ ] 1.1 Definir schemas normalizados para commits, atividade, arquivos e hunks de diff.
- [ ] 1.2 Ampliar a consulta de detalhe com metadados leves sem carregar patches completos.
- [ ] 1.3 Criar consultas lazy separadas para atividade e diff do arquivo selecionado.
- [ ] 1.4 Implementar cache, limites de tamanho, timeout e erros parciais por seção.
- [ ] 1.5 Expor as consultas no router tRPC de pull requests.

## 2. Interface de detalhe

- [ ] 2.1 Adicionar navegação compacta entre `Resumo`, `Arquivos` e `Atividade`.
- [ ] 2.2 Implementar lista de arquivos alterados com status e estatísticas.
- [ ] 2.3 Implementar visualização de diff por arquivo com linhas e hunks legíveis.
- [ ] 2.4 Implementar timeline somente leitura para commits, comentários e reviews.
- [ ] 2.5 Preservar redimensionamento, layout estreito, posição de rolagem e abertura no GitHub.

## 3. Acessibilidade e performance

- [ ] 3.1 Garantir navegação por teclado, foco visível, nomes acessíveis e semântica dos contextos.
- [ ] 3.2 Virtualizar listas ou patches grandes quando medições justificarem.
- [ ] 3.3 Impedir fetch antecipado de atividade e patches de arquivos não selecionados.
- [ ] 3.4 Tratar diffs binários, truncados, removidos e indisponíveis sem quebrar o painel.

## 4. Qualidade e verificação

- [ ] 4.1 Cobrir normalização, paginação/limites, cache e falhas parciais com testes unitários.
- [ ] 4.2 Validar PRs pequenos, grandes, sem descrição, sem comentários e com arquivos binários.
- [ ] 4.3 Executar build e verificações disponíveis no projeto.
- [ ] 4.4 Verificar visualmente temas claro/escuro, painel redimensionado e largura compacta.
