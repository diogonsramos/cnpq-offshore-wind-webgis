# TODO F15: Refinements v1.0.1

## Phase 1: Preparation & Landing Page
- [x] Aguardar a adição manual das imagens (fluxograma em EN/ES, logos de parceiros, fotos de pesquisadores externos).
- [x] Internacionalizar a imagem do fluxograma na Landing Page (`fluxo_br.jpg`, `fluxo_en.png`, `fluxo_es.png`) de acordo com o idioma selecionado.
- [x] Implementar título do projeto dinâmico no Header ao rolar a página (aparecer de forma suave antes das logos do CNPq/SENAI, adaptado para responsividade mobile/tablet).
- [x] Adicionar logos de instituições parceiras na seção "Apoio Institucional" (La Universidad de la República, NVIDIA, UFSC, SENAI CIMATEC).
- [x] Adicionar subseção "Pesquisadores Externos" na área da Equipe do Projeto (Felipe Mendonça Pimenta, Simon See, Pedro Mário Cruz e Silva, Alejandro Gutiérrez, Alex Alisson Bandeira Santos) com suas respectivas fotos e links.

## Phase 2: Camada IBAMA (WebGIS)
- [x] Processar/implementar o arquivo KMZ de áreas eólicas offshore em licenciamento pelo IBAMA.
- [x] Adicionar opção de exibir a camada do IBAMA no menu lateral direito do WebGIS.
- [x] Incluir link para o PDF oficial do IBAMA no popup de detalhes ou na interface da camada.

## Phase 3: Refinamento de Exportações (Gráficos e Screenshots)
- [x] Dashboard: Adicionar informação de filtro (modelo, variável, altura, experimento) no PDF gerado na exportação de gráficos.
- [x] WebGIS: Exibir escala de cores, direção Norte, grade lat/lon e filtros utilizados na imagem salva pela função 'baixar screenshot do mapa'.

## Phase 4: Análise de Performance e Conclusão
- [ ] Investigar possível otimização para a latência de troca de modelo/experimento no minimapa do Dashboard.
- [ ] Validar i18n em todos os novos textos e opções (pt-BR, en, es).
- [ ] Rodar testes locais (`pnpm test:full`) antes de consolidar o Pull Request.
