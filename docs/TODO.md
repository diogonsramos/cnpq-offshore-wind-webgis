# 📝 Roadmap de Desenvolvimento & UI/UX: CNPq WebGIS Offshore

Este documento centraliza as atividades necessárias para corrigir as regressões de interface, refatorar a navegação global, implementar os gráficos analíticos baseados no padrão *Global Wind Atlas (GWA)* (https://globalwindatlas.info/en/) e criar a nova Landing Page do projeto.

---

## 🚀 1. Landing Page (Página Inicial)
> **Objetivo:** Criar uma porta de entrada institucional e moderna para o sistema, eliminando o carregamento direto do mapa pesado e contextualizando o fomento do CNPq.

- [ ] **1.1. Layout & Estrutura Base:**
  - [ ] Criar uma rota raiz (`/` ou `Home`) separada do ambiente de mapas.
  - [ ] Adicionar seção de *Hero* com o título oficial do projeto: *"Cenário atual e futuro do recurso eólico offshore no Brasil"*.
  - [ ] Inserir os dois botões principais de chamada para ação (CTA) com destaque visual:
    * `Abrir WebGIS Map` (Redireciona para o visualizador espacial).
    * `Abrir Analytical Dashboard` (Redireciona diretamente para a análise estatística).
- [ ] **1.2. Seções de Conteúdo Técnico:**
  - [ ] **Resumo Técnico:** Resumo do projeto detalhando o uso do modelo WRF, resoluções ($9\text{ km} \times 9\text{ km}$), dados de contorno (ERA5, CMIP6 SSP2-4.5 e SSP5-8.5).
  - [ ] **Galeria/Card de Imagens:** Adicionar espaço para capturas de tela (*prints*) das camadas do WebGIS e dos gráficos em funcionamento.
  - [ ] **Créditos e Fomento:** Logomarca em destaque do CNPq, Chamada CNPq Nº 407949/2022-4, dados da equipe de pesquisadores e publicações relacionadas.

---

## 🎨 2. Front-End & UI/UX (Interface Geral)
> **Objetivo:** Implementar a navegação por abas superiores, resolver os travamentos e embutir os componentes gráficos do Plotly no padrão GWA.

- [ ] **2.1. Refatoração da Navegação Global (Abas Superiores):**
  - [ ] Criar uma barra de navegação superior fixa (*Navbar*) contendo as abas: `WebGIS Map` e `Analytical Dashboard`.
  - [ ] Garantir a persistência do estado global: alternar entre as abas **não deve** resetar os filtros selecionados (Experimento, Variável) nem limpar as coordenadas salvas pelo usuário.
- [ ] **2.2. Correção de Bugs Críticos (Garantia de Qualidade):**
  - [ ] **Bug do Mapa Cinza/Lado:** Corrigir o ciclo de vida do contêiner do mapa. Forçar o recálculo do tamanho do mapa (ex: `map.invalidateSize()` se Leaflet) utilizando um gatilho/efeito assim que a aba `WebGIS Map` for montada ou focada.
  - [ ] **Botão Fechar no Painel Direito:** Adicionar um botão de fechamento (`X`) explícito no topo do painel lateral direito para fechar os menus de FAQ e Informações do Projeto, devolvendo a área total da tela ao mapa.
- [ ] **2.3. Implementação dos Gráficos Avançados (Padrão Plotly/GWA):**
  - [ ] **Perfil Vertical do Vento (Aba WebGIS e Dashboard):** Plotar a velocidade do vento no eixo X e as alturas disponíveis ($10\text{ m}, 50\text{ m}, 100\text{ m}, 150\text{ m}, 200\text{ m}$) no eixo Y. O gráfico deve buscar todas as alturas via GeoParquet, independentemente da camada ativa no mapa.
  - [ ] **Rosa dos Ventos (Aba Dashboard):** Implementar o gráfico polar de barras (`type: 'barpolar'`) com a distribuição de frequência e direção do vento.
  - [ ] **Matriz de Calor / Heatmap (Aba Dashboard):** Criar o gráfico de cruzamento Hora (Y) vs. Mês (X) mostrando a variabilidade da velocidade do vento em uma escala de cores gradiente (azul/verde para fraco, amarelo/vermelho para forte).
  - [ ] **Gráfico de Radar (Aba Dashboard):** Plotar as 24 horas no círculo angular com 12 linhas sobrepostas (uma para cada mês do ano).
  - [ ] **Curva de Weibull Dinâmica:** Substituir os valores numéricos de $k$ e $c$ por um gráfico de linha contínua da PDF (Função de Densidade de Probabilidade).

---

## ⚙️ 3. Back-End, API & Engenharia de Dados
> **Objetivo:** Garantir a entrega performática dos dados do GeoParquet e implementar o motor de cálculo de energia.

- [ ] **3.1. Otimização de Consultas Espaciais no GeoParquet:**
  - [ ] Otimizar as rotas da API para aceitar arrays de coordenadas (até 3 pontos simultâneos) vindos do clique do mapa ou entrada de texto.
  - [ ] Retornar o pacote completo de variáveis de um pixel em uma única requisição (médias de vento em todas as alturas, parâmetros de Weibull locais, dados de direção para a Rosa dos Ventos).
- [ ] **3.2. Motor de Cálculo de Estimativa de Energia (AEP):**
  - [ ] Criar a lógica de retrodados para simular a Curva de Potência de uma turbina padrão (Ex: Genérica 4.5 MW - Classe IEC 2).
  - [ ] Desenvolver o algoritmo que realiza a convolução matemática entre a Distribuição de Weibull do pixel consultado e a Curva de Potência da turbina selecionada para estimar a Produção Anual de Energia (AEP - Annual Energy Production) considerando as perdas parametrizadas pelo usuário.

---

## 📊 4. Componente Dashboard Global (Multi-Localidades)
> **Objetivo:** Permitir a análise comparativa avançada sem loops ou fechamentos inesperados de tela.

- [ ] **4.1. Controle de Estado Multi-Pixel:**
  - [ ] Permitir que o usuário adicione até 3 localidades simultaneamente na lista de comparação.
  - [ ] Associar uma cor de identificação estrita para cada ponto (ex: Ponto 1 = Azul, Ponto 2 = Vermelho, Ponto 3 = Verde).
- [ ] **4.2. Sobreposição de Dados (Traces Overlapping):**
  - [ ] Configurar os gráficos do Plotly no Dashboard (Série Temporal, Perfil Vertical e Weibull) para renderizar até 3 linhas/séries na mesma tela quando houver múltiplos pontos selecionados.
- [ ] **4.3. Entrada Manual de Coordenadas:**
  - [ ] Desenvolver o formulário de validação numérica no topo do Dashboard para inserção direta de valores de Latitude e Longitude via teclado, disparando a busca no GeoParquet da mesma forma que o clique no mapa.

---

## 📚 5. Documentação Integrada & Metadados
> **Objetivo:** Fornecer autonomia de informação ao usuário final diretamente pelos painéis inferiores da barra esquerda.

- [ ] **5.1. FAQ Estruturado (20 Perguntas e Respostas):**
  - [ ] Criar o componente de Accordion (Retrátil) no painel esquerdo para abrigar as 20 principais dúvidas do projeto.
  - [ ] *Lista de Tópicos Obrigatórios a redigir:* Fontes dos dados (WRF e ERA5), resolução espacial de $5\text{ km}$, metodologia das faixas de batimetria (0 a -100m), origem dos shapefiles regulatórios, significado de variáveis como Densidade de Potência, volume total de dados ($1.7\text{ TB}$ em Zarr), horizontes temporais avaliados (século XXI) e formato correto de citação científica do projeto.
  - [ ] **Revisão Cruzada FAQ:** Verificar e corrigir as 20 respostas em `src/lib/metadata.ts` contra os valores definitivos em `docs/INFO_PROJECT.md`. Discrepâncias conhecidas: número do processo (FAQ diz "Chamada CNPq Nº 45/2024", DOCX diz "Projeto 407949/2022-4"), dimensões da grade (FAQ diz "534×263", DOCX aponta D02 como "388×553").
- [ ] **5.2. Metadados Internos:**
  - [ ] Mapear e descrever em tabela legível todas as variáveis disponíveis para download ou visualização no sistema, indicando as unidades de medida oficiais de acordo com o padrão do CNPq.
  - [ ] **Incorporação de Logomarcas:** Adicionar os arquivos `docs/logo-cnpq.png`, `docs/logo-peob-cnpq.png` e `docs/logo-senai-cimatec.png` no footer da Landing Page e no painel de Informações do Projeto.
  - [ ] **Disclaimer de Dados no README:** Adicionar aviso no `README.md` do projeto informando que os dados disponíveis neste repositório são **preliminares, para fins de desenvolvimento**. Os dados finais (otimizados em formato e performance) serão atualizados posteriormente.

---

## ⚡ 6. Otimização de Performance & Engenharia de Dados do Dashboard
> **Objetivo:** Garantir respostas sub-segundo nas consultas do dashboard multi-localidade (3 pontos simultâneos) e assegurar renderização fluida a 60 FPS.

### 6.1. Data Engineering & Server-Side (GeoParquet / Backend)
> **Contexto:** Atualmente o frontend carrega o GeoParquet inteiro via WebAssembly (~17-19 MB por experimento) e realiza busca euclidiana em ~140k registros. Para escalar com múltiplos pontos simultâneos e preparar para datasets maiores, é necessário um backend leve.

- [ ] **6.1.1. Indexação Espacial & Particionamento:** Definir estratégia de particionamento dos GeoParquet. Padronizar por `Experiment` e `Height`, ou aplicar indexação espacial via H3 Hexágonos / S2 Geometry para acelerar consultas ponto-em-polígono e coordenadas pontuais.
- [ ] **6.1.2. Otimização de Compressão:** Avaliar e implementar o codec de compressão ideal (Snappy vs. ZSTD) no pipeline Python/Conda de geração dos GeoParquet para minimizar I/O durante requisições do frontend.
- [ ] **6.1.3. Camada de Agregação de Consultas:** Configurar motor analítico leve (ex.: DuckDB ou Fastparquet via FastAPI) como ponte entre o frontend e os arquivos GeoParquet. A API deve processar requisições de até 3 coordenadas simultâneas, realizando fatias colunares rápidas nos arquivos Parquet em vez de escanear o dataset inteiro.
- [ ] **6.1.4. Estratégia de Cache Server-Side:** Implementar cache (ex.: Redis ou memory-cache) para coordenadas de pixel frequentemente acessadas — como clusters eólicos offshore (ex.: Bacia de Campos, litoral do RN/CE) e capitais estaduais costeiras — para eliminar leituras redundantes de disco.

### 6.2. Frontend Performance & Stress Testing (Dashboard)
> **Contexto:** Os gráficos atuais usam Chart.js sem aceleração WebGL. Com 3 pontos simultâneos e séries temporais longas, a renderização pode cair abaixo de 30 FPS.

- [ ] **6.2.1. Fetch Assíncrono Paralelo:** Configurar o state manager do frontend para disparar requisições assíncronas paralelas (`Promise.all` ou `Promise.allSettled`) na recuperação de séries temporais para os 3 pontos comparativos, evitando bloqueio da UI.
- [ ] **6.2.2. Aceleração WebGL no Plotly:** Para gráficos de alta densidade (séries temporais horárias multi-ano, heatmaps multi-traço), migrar de Chart.js para Plotly com tipos acelerados por WebGL (`scattergl` em vez de `scatter`, `heatmapgl` etc.) para manter 60 FPS suaves em scroll e hover.
- [ ] **6.2.3. Script de Teste de Estresse End-to-End:** Criar rotina de teste automatizada (ou sequência de validação manual documentada) no dashboard onde 3 pins offshore arbitrários são selecionados simultaneamente para verificar:
  - *Footprint* de memória do navegador (alvo: < 200 MB adicionais)
  - Latência de renderização dos gráficos (alvo: < 500 ms para exibir todos os traces)
  - Consumo de CPU durante animações/hover

### 6.3. Benchmarks & Documentação de Performance
- [ ] **6.3.1. Definição de SLAs:** Estabelecer métricas-objetivo documentadas:
  - Consulta de pixel único via API: < 100 ms
  - Carregamento do dashboard com 3 pontos: < 500 ms
  - Uso de memória adicional no frontend: < 50 MB
  - Renderização de gráfico individual: < 200 ms
- [ ] **6.3.2. Script de Benchmark Automatizado:** Criar script Node.js ou Python para medir tempos de resposta da camada de consulta GeoParquet e registrar resultados em `docs/BENCHMARKS.md`.
- [ ] **6.3.3. Data Pipeline Profiling:** Instrumentar o pipeline de geração de dados (NetCDF → COG + GeoParquet) para registrar tempos de processamento por etapa, compressão alcançada e taxa de acerto do cache, visando identificar gargalos para a versão final dos dados.

---

> **Nota:** As tarefas desta seção pressupõem a introdução de um backend leve (FastAPI + DuckDB) e a migração gradual de Chart.js para Plotly nos gráficos de alta densidade. Consulte `docs/INFO_PROJECT.md` para a especificação completa dos datasets e `src/lib/pixelQuery.ts` para a arquitetura atual de consultas.