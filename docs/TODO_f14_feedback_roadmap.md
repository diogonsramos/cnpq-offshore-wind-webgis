# TODO f14 - Melhorias Pós-Lançamento (Feedback v1.0.0)

Este documento mapeia o plano de ação estruturado com base nos feedbacks recebidos dos usuários (Hallan, Yossimar, Vitor, Diogo) após o lançamento da v1.0.0.

## 1. Roteamento e Estado (Branch: `feat/f14-routing-persistence`)
- [ ] Implementar rotas na aplicação.
- [ ] Garantir que, ao atualizar a página (F5), o usuário permaneça na rota atual em vez de retornar para a página inicial.

## 2. Reestruturação do Dashboard (Branch: `feat/f14-dashboard-redesign`)
- [ ] Substituir o layout atual baseado em painéis horizontais por uma estrutura de coluna vertical contínua.
- [ ] Mover os filtros de análise regional para um menu lateral esquerdo permanente.
- [ ] Reposicionar os filtros à direita do minimapa para baixo do minimapa.
- [ ] Adicionar funcionalidade para ocultar/minimizar o painel do minimapa e filtros (Modo Foco).
- [ ] Ajustar rolagem dos gráficos, evitando cortes e suprimindo rolagens internas excessivas.

## 3. Visualização de Dados e Gráficos (Branch: `feat/f14-charts-enhancement`)
- [x] Ajustar os limites do eixo Y (`ylim`) dos boxplots no Dashboard (evitar compressão dos dados > 15m/s).
- [x] Substituir a rosa dos ventos por uma versão visualmente mais moderna e polida.
- [x] Incluir altura de referência (ex: 100m) nos boxplots de WPD e melhorar contexto visual nos gráficos de batimetria.
- [x] Adicionar metadados (modelo, cenário, altura e variável) nos marcadores inseridos no mapa de análise regional.

## 4. Interface Geral do WebGIS (Branch: `feat/f14-webgis-ui`)
- [ ] Remover os títulos redundantes ("Mapeamento Eólico Offshore", "Visualizador de COGs") e remover nome do modelo dos cenários (ex: "WRF ERA5" -> "ERA5").
- [ ] Remover botões fixos desnecessários do menu lateral (FAQ, Projeto, Dashboard) e limpar cabeçalho das variáveis.
- [ ] Reposicionar a barra de cores do mapa para o lado esquerdo e isolar dos controles de Zoom (+/-).
- [ ] Alterar o layout da seleção de mapas-base para exibição vertical.
- [ ] Destacar visualmente no mapa a ZEE ou os Estados efetivamente filtrados.

## 5. Landing Page e UX (Branch: `fix/f14-home-aesthetics`)
- [ ] Padronizar tipografia e diminuir tamanho de fonte em seções descritivas ("Resumo Técnico", "Comparação", "Publicações").
- [ ] Adicionar flags (bandeiras) ao seletor de idiomas e substituir ícone de 'Voltar ao topo'.
- [ ] Substituir a imagem da ZEE com turbinas por uma animação/GIF na Seção 3.
- [ ] Corrigir corte no logo do footer e remover espaço em branco entre CNPq/SENAI no cabeçalho.
- [ ] Remover referência técnica a "variáveis no frontend" e adicionar contexto ao link "Xu et al. (2021)".

## 6. Infraestrutura (Branch: `chore/f14-vercel-migration`)
- [ ] (Opcional) Avaliar a viabilidade de migração do GitHub Pages para a Vercel.
