# 📝 Feature Specification: f11 — UI Fixes, Dashboard Layout & WebGIS Tuning

> **Status:** Implementado e validado  
> **Objetivo:** Refatoração completa da estrutura do Dashboard (migração para layout vertical unificado), simplificação da barra de navegação global (Header), e ajustes técnicos visuais (gráficos, mapas WebGIS, textos e exportação de PDF).

---

## 1. Contexto

A etapa `f11` foca na modernização e unificação do layout da aplicação. A navegação baseada em *TabBar* separada foi removida, integrando tudo em um **Header unificado**. O Dashboard, anteriormente restrito a um layout que escondia seletores e gráficos dependendo do tamanho da tela, foi redesenhado para um padrão **vertical e mais integrado**, movendo controles secundários para o `SidePanel`. Além disso, pequenos ajustes cruciais nos textos do WebGIS e no visual dos componentes visuais foram realizados.

---

## 2. Escopo Concluído

### 2.1 Navegação e Header
- **Unificação Global:** Remoção da antiga barra `TabBar`. A navegação (Home, Metodologia, WebGIS, Dashboard) foi inteiramente consolidada no `.global-header`.
- **Botões e Ações:** O botão "FAQ" do header foi removido para diminuir a carga cognitiva. O seletor de idiomas (`LocaleToggle`), antes composto por ícones de bandeiras e texto, foi simplificado para exibir apenas as siglas textuais (BR, US, ES) integradas diretamente no alinhamento superior, com fontes ajustadas ao tamanho dos links principais.

### 2.2 Dashboard Vertical e Painel Lateral
- **Novo Layout do Dashboard:** Conversão da estrutura em colunas do Dashboard para um **layout vertical**, garantindo que as tabelas de comparação e os gráficos fiquem melhor organizados e visíveis sem quebrar em telas menores.
- **Relocação de Ferramentas:** Ferramentas operacionais do mapa, como o *Seletor de Basemap* e a ferramenta de *Screenshot/Exportação*, foram extraídas da área principal e agrupadas no **SidePanel** (Painel Lateral), abrindo mais espaço para a visualização dos dados geoespaciais.
- **Exportação de PDF:** Corrigidos problemas visuais (`CSS media print`) que causavam cortes no layout (`clipping`) durante a impressão e exportação do Dashboard.

### 2.3 Visualização de Mapas e Gráficos (WebGIS)
- **Barra de Cores (Colorbar):** Aumento considerável no tamanho da Colorbar do mapa e redimensionamento das fontes (título e *ticks* numéricos) para melhor legibilidade. Posicionada no canto inferior direito conforme *mockup* visual. Os intervalos foram padronizados: a cada **2 m/s** (Vento) e a cada **200 W/m²** (Densidade de Potência).
- **Remoção de Camadas Desnecessárias:** O item `Distância Costa 0.00nm` na aba "Localização" foi removido.
- **Mapeamento:** Ignorou-se e removeu-se (ocultamento) a tentativa de exibir a *Rosa dos Ventos* em áreas (pixels vazios próximos do continente) para o item de *Distribuição Direcional*.

### 2.4 Textos e Conteúdo Editorial
- **WRF vs MPAS:** Adicionada uma observação (frase de aviso) abaixo do painel de comparação WRF x MPAS informando o usuário que áreas costeiras próximas do continente (pixels vazios) são áreas de restrição e foram intencionalmente ignoradas. A frase antiga promocional de dados brutos foi deletada.
- **Projeções Climáticas e Metodologia:** O texto descritivo do "Ensemble CMIP6" foi reescrito detalhando que "o estudo original não fez validação nem calibração do *bias correction* para a América do Sul". A resposta detalhada sobre como foi feito o *Spin-up* da simulação (12 horas iniciais descartadas) foi adicionada ao FAQ.
- **Referências:** Referência bibliográfica principal de `Xu et al. (2021)` corrigida.

### 2.5 Testes E2E (Fase de Estabilização)
- A alteração drástica na navegação (remoção de `.tab-bar`, novo formato de header, exclusão de itens de FAQ) quebrou grande parte dos testes E2E do Playwright (`01-landing-page`, `02-navigation`, `04-scroll-and-inpage-nav` e `05-team-and-faq`). Todos os seletores e contadores de itens (`expect(items).toHaveCount(...)`) foram atualizados para restabelecer a integração contínua (CI).
