## 1. Backend e contrato

- [x] 1.1 Implementar extração de run id do GitHub Actions a partir da URL de um check (`/\/actions\/runs\/(\d+)/`), com checks não correspondentes marcados como não suportados.
- [x] 1.2 Implementar `rerunFailedChecks` agrupando checks com falha por run id único e chamando `gh run rerun <runId> --repo <owner>/<repo> --failed` para cada um.
- [x] 1.3 Agregar o resultado (execuções reexecutadas, checks não suportados, execuções que falharam ao reexecutar) em vez de tudo-ou-nada; falha total vira erro, sucesso parcial retorna o resumo.
- [x] 1.4 Reaproveitar `classifyGitHubError` para classificar falhas por execução.
- [x] 1.5 Expor `pullRequests.rerunFailedChecks` como mutation no router tRPC.

## 2. Interface

- [x] 2.1 Adicionar botão "Re-run failed checks" no cabeçalho do detalhe, visível apenas quando há checks com falha em um PR aberto/rascunho.
- [x] 2.2 Passar `detail.checkItems` para o componente determinar checks suportados vs. não suportados.
- [x] 2.3 Diálogo de confirmação lista os checks que serão reexecutados e os que serão ignorados (com o motivo), antes de qualquer chamada.
- [x] 2.4 Desabilitar a confirmação quando nenhum check com falha for suportado (só CI externo).
- [x] 2.5 Ao suceder (total ou parcial), fechar o diálogo, mostrar um resumo preciso (quantos reexecutados, quantos ignorados) e atualizar detail/list.

## 3. Acessibilidade

- [x] 3.1 Garantir navegação por teclado, foco visível e retorno de foco ao fechar o diálogo (mesmo padrão de Approve/Request Changes).
- [x] 3.2 Anunciar estados de envio, sucesso e erro para leitores de tela (`role="alert"` no erro; toast de sucesso/aviso).

## 4. Qualidade e verificação

- [x] 4.1 Testes unitários para extração de run id (URLs válidas, inválidas, ausentes) em `pull-request-checks.test.js`.
- [x] 4.2 Executar testes, build e checagem de tipos, distinguindo diagnósticos preexistentes.
- [ ] 4.3 Validar manualmente em um repositório com GitHub Actions configurado (não disponível neste ambiente): reexecução bem-sucedida, sucesso parcial, checks de CI externo ignorados, falta de permissão.
