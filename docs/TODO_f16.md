# TODO f16: Tour Guiado, Screenshots e Ajustes de Links

## Etapa 1: Mapeamento e Captura de Telas (Screenshots)
Criaremos um script de teste E2E usando **Playwright** para acessar o servidor local (`http://localhost:3000/`) e capturar as telas atualizadas da aplicação, garantindo que o WebGIS contenha os últimos recursos (polígonos do IBAMA, refinamentos, etc).
**Ações:**
- [ ] Criar a pasta `public/images/screens`.
- [ ] Criar/atualizar um script no Playwright (ex: `tests/e2e/screenshots.spec.ts`) que:
  - Acesse o WebGIS localmente (`http://localhost:3000/#map`).
  - Aguarde o carregamento completo.
  - Tire o screenshot da visão geral da página e salve como `public/images/screens/passo1_visao_geral.png`.
  - Tire o screenshot com foco apenas no painel esquerdo de filtros e salve como `public/images/screens/passo2_filtros.png`.
  - Clique em um ponto no mapa, navegue até a aba do Dashboard e espere os gráficos carregarem.
  - Tire o screenshot do Dashboard e salve como `public/images/screens/passo3_dashboard.png`.

## Etapa 2: Implementação do Guia Interativo (Onboarding)
Utilizaremos a biblioteca `driver.js` via pacote NPM para uma integração perfeita e controle de estado moderno no React.
**Ações:**
- [ ] Instalar a biblioteca: `pnpm add driver.js`.
- [ ] Criar um componente (ex: `TourGuide.tsx`) que englobe a lógica do tour.
- [ ] Implementar a exibição da modal inicial ("Bem-vindo ao Atlas... Deseja um tour?")
- [ ] Controlar via `localStorage` (ex: `hasCompletedTour`) para que o tour inicial só seja disparado na primeira visita real do usuário.
- [ ] Configurar os passos do `driver.js` focando nos seletores da nossa interface real.
- [ ] Adicionar um botão discreto de "Ajuda" ou "Tour" na interface para reativar o tour manualmente (talvez um botão com ícone "?" ao lado do idioma).
- [ ] Implementar as traduções dos textos para pt-BR, en e es.

## Etapa 3: Ajustes Pontuais na Landing Page (Links Oficiais)
Atualizar as tabelas e o texto da página inicial (Landing Page) adicionando as fontes e links oficiais:
**Ações:**
- [ ] Na tabela de comparação WRF vs MPAS, transformar os títulos dos modelos em links clicáveis apontando para:
  - WRF: `https://www.mmm.ucar.edu/models/wrf`
  - MPAS: `https://www.mmm.ucar.edu/models/mpas`
- [ ] Adicionar link de referência para os dados ERA5 apontando para: `https://cds.climate.copernicus.eu/datasets`
- [ ] Adicionar um botão ou parágrafo explicativo na Landing Page ou WebGIS para o Mapa de Licenciamentos Oficiais do IBAMA (`https://www.gov.br/ibama/pt-br/assuntos/laf/consultas/mapas-de-projetos-em-licenciamento-complexos-eolicos-offshore`), direcionando o usuário a conferir os projetos diretamente na fonte.
