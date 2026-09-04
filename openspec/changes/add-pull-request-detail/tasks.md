## 1. Contratos e acesso ao GitHub

- [x] 1.1 Definir schemas normalizados para commits, atividade, arquivos e hunks de diff.
- [x] 1.2 Ampliar a consulta de detalhe com metadados leves sem carregar patches completos.
- [x] 1.3 Criar consultas lazy separadas para atividade e diff do arquivo selecionado.
- [x] 1.4 Implementar cache, limites de tamanho, timeout e erros parciais por seção.
- [x] 1.5 Expor as consultas no router tRPC de pull requests.

## 2. Interface de detalhe

- [x] 2.1 Adicionar navegação compacta entre `Resumo` e `Arquivos` (revisado de 3 para 2 contextos: Atividade foi incorporada ao Resumo após feedback de uso).
- [x] 2.2 Implementar lista de arquivos alterados com status e estatísticas.
- [x] 2.3 Implementar visualização de diff por arquivo com linhas e hunks legíveis.
- [x] 2.4 Implementar timeline somente leitura para commits, comentários e reviews.
- [x] 2.5 Preservar redimensionamento, layout estreito, posição de rolagem e abertura no GitHub.

## 3. Acessibilidade e performance

- [x] 3.1 Garantir navegação por teclado, foco visível, nomes acessíveis e semântica dos contextos.
- [x] 3.2 Virtualizar listas ou patches grandes quando medições justificarem.
- [x] 3.3 Impedir fetch antecipado de atividade e patches de arquivos não selecionados.
- [x] 3.4 Tratar diffs binários, truncados, removidos e indisponíveis sem quebrar o painel.

## 4. Qualidade e verificação

- [x] 4.1 Cobrir normalização, paginação/limites e conteúdo indisponível com testes unitários.
- [x] 4.2 Validar dados reais, ausência de atividade, patches grandes e arquivos sem patch.
- [x] 4.3 Executar build e verificações disponíveis no projeto.
- [ ] 4.4 Verificar visualmente temas claro/escuro, painel redimensionado e largura compacta.
