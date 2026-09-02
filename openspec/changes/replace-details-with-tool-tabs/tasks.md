## 1. Approval
- [x] 1.1 Revisar e aprovar a proposta antes de modificar código de produção.

## 2. State and panel shell
- [x] 2.1 Criar estado tipado, persistido por janela/workspace, com abrir, ativar, fechar e restaurar abas.
- [x] 2.2 Validar dados persistidos, IDs únicos, seleção inválida e compatibilidade com preferências antigas.
- [x] 2.3 Substituir Details/Files e Edit widgets pelo seletor e faixa de abas com `+`, fechar e recolher.
- [x] 2.4 Implementar navegação por teclado, foco, rolagem da faixa e estados vazios.

## 3. Tool content
- [x] 3.1 Integrar Workspace, To-dos e Plan, preservando atualização por subchat e aprovação de plano.
- [x] 3.2 Integrar Terminal, preservando múltiplas sessões, escopo, diretório, saída e dimensionamento ao reativar.
- [x] 3.3 Integrar Changes e revisão de diff, mantendo seleção de arquivos e ações de Git.
- [x] 3.4 Integrar Files e abas de arquivo, preservando busca, árvore, tipos de visualizador e tratamento de erros.
- [x] 3.5 Remover MCP Servers do painel sem alterar MCP em Settings ou no backend.

## 4. Integration and cleanup
- [x] 4.1 Redirecionar botões, atalhos, links de arquivos e ações laterais para as abas.
- [x] 4.2 Remover montagem concorrente de sidebars e os efeitos legados de exclusão/restauração no modo lateral.
- [x] 4.3 Preservar modos não laterais existentes e impedir montagem duplicada de terminais/visualizadores.
- [x] 4.4 Remover configurações e código exclusivos dos widgets substituídos, mantendo caches e estado das funcionalidades.

## 5. Verification
- [x] 5.1 Verificar transições, deduplicação de abas, restauração, isolamento por workspace/janela e dados inválidos.
- [x] 5.2 Validar na interface abertura, alternância, fechamento, reabertura, atalhos, foco e ausência de cortes.
- [ ] 5.3 Verificar terminal persistente, arquivos por todos os pontos de entrada, plano/tarefas por subchat e restrições remotas.
- [x] 5.4 Rodar build e comparar TypeScript com o baseline, documentando limitações e erros preexistentes.

A verificação 5.3 está parcialmente coberta por inspeção das integrações e pelo harness de interface; o smoke test completo com backend Electron permanece pendente. Ver `verification.md`.
