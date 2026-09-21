# 📝 Feature Specification: f12 — Project Scan, Cleanup, Security & Documentation (v1.0 Preparation)

> **Status:** Finalizado  
> **Objetivo:** Preparar o repositório para a marcação da tag `v1.0` (Release Final). Isso incluiu varredura de arquivos inúteis, correção de vulnerabilidades nas dependências de desenvolvimento, refatoração de bibliotecas legadas e uma extensa reescrita da documentação do projeto.

---

## 1. Contexto

A fase `f12` atuou como uma camada final de estabilização e padronização. Uma vez que o WebGIS obteve todas as suas *features* finalizadas (filtros GeoParquet, WebAssembly, layouts verticais responsivos e internacionalização), era imprescindível remover o lixo do histórico de desenvolvimento, auditar os pacotes do Node.js, e preparar o `README` para apresentação pública à comunidade científica.

---

## 2. Escopo Concluído

### 2.1 Limpeza e Organização (Housekeeping)
Os seguintes arquivos temporários, rascunhos ou componentes inutilizados foram identificados e deletados permanentemente para reduzir ruído:
- `scratch.tsx` e `temp_schema_debug.txt` (Arquivos de debug da equipe de desenvolvimento)
- `METADADOS.md` e `CLAUDE.md` (Guias desatualizados de metadados e agentes autônomos)
- `src/components/TabBar.tsx` (Substituído integralmente pelo Header unificado da fase f11)
- `src/components/ProfileChart.tsx`, `WindRoseChart.tsx`, `WeibullChart.tsx` (Antigos gráficos estáticos baseados no Chart.js)

### 2.2 Refatoração e Otimização do Bundle
- **Remoção do Chart.js:** As bibliotecas `chart.js` e `react-chartjs-2` foram removidas do `package.json`. Toda a aplicação agora utiliza unicamente o motor acelerado do `Plotly.js`, o que representa uma economia significativa de tamanho e um build muito mais limpo.
- **PixelInfoPanel Plotly Migration:** Os três mini-gráficos presentes no painel de estatística lateral foram migrados com sucesso de Chart.js para `react-plotly.js`. Foram configuradas as opções `displayModeBar: false` e um layout ultra minimalista para caber no painel perfeitamente.

### 2.3 Auditoria e Dependências (Segurança)
- Rodamos o `pnpm update` e as varreduras de segurança para eliminar `Moderate` e `High` vulnerabilities sinalizadas pelo npm registry (como problemas nas engines do `postcss` e `browserslist`). 
- As versões do Playwright, Vite plugins e Eslint foram promovidas a *patch versions* seguras.

### 2.4 Documentação Oficial (README)
- **`README.md` Reescrevido:** O guia raiz do projeto foi escrito do zero. Agora apresenta uma vitrine clara dos módulos: Landing Page Institucional, Interactive Map (WebGIS) e Analytical Dashboard. Foram removidas menções antigas a designs obsoletos.
- **`README_EN.md` Adicionado:** Elaborou-se uma tradução nativa e estruturada para inglês, garantindo abrangência global à plataforma do projeto CNPq.

---

## 3. Impacto e Build

- A aplicação passa por `pnpm build` livre da bagagem e duplicidade do Chart.js.
- O repositório encontra-se pronto para gerar o release `v1.0`.
