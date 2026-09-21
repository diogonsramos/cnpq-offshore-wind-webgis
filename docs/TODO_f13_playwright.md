# 📝 Feature Specification: f13 — Playwright E2E Overhaul (Repaginação Total)

> **Status:** Finalizado  
> **Objetivo:** Refatorar a suíte de testes E2E do Playwright para se adequar às grandes transformações de interface da v1.0, eliminar as redundâncias e corrigir o ambiente de dependências corrompido (`test.describe`).

---

## 1. Contexto

Com a finalização da interface unificada (Header global, Dashboard vertical único, Drawer para o FAQ e remoção do Chart.js), a antiga suíte de 91 testes do Playwright ficou defasada. Cerca de 25 testes quebravam diariamente devido a seletores inexistentes (`.tab-bar`, `.dv-tab-panel` e `.lp-faq-list` na landing page).

Além disso, após as correções de dependências da fase f12, os runners do Playwright foram atualizados para a versão `1.63.0` o que gerou um erro de escopo duplicado na interpretação dos arquivos.

---

## 2. Escopo Concluído

### 2.1 Resolução do Ambiente
- **Deduplicação do Node:** Foi executado `pnpm dedupe` e `pnpm install --force`, além do download do novo binário em cache do Chromium (`pnpm exec playwright install chromium`), resolvendo os conflitos de múltiplas versões do pacote no lockfile e restaurando o runner.

### 2.2 Refatoração Estrutural (Testes Migrados)
- **`01-landing-page.spec.ts` & `02-navigation.spec.ts`**: Atualizados para lidar com os novos fluxos de navegação que substituem o TabBar (`.app-layout`, `.dashboard-view`, `.map-container`). 
- **`03-responsiveness.spec.ts`**: Testes focados agora no Dashboard Unificado e na Landing Page de forma genérica, sem tentar selecionar elementos das antigas abas (Visão Simples, Comparar Experimentos, etc.).
- **`06-dashboard-controls.spec.ts`**: Remodelado completamente para focar na nova arquitetura do Dashboard. Adicionados testes mais granulares para `Fullscreen` e seleção nos dropdowns do `SidePanel`.
- **`11-performance.spec.ts`**: Reduzido e focado apenas no carregamento reativo do Plotly (`Lazy-loading`) pela aba Dashboard e pelos botões de navegação globais.
- **`12-i18n.spec.ts`**: Ajustado para reconhecer o `LocaleToggle` movido para o Header Global (`.gh-locale`). Agora valida corretamente a persistência do idioma sem depender do TabBar.

### 2.3 Expurgo de Testes Obsoletos
Para enxugar a suíte de regressão (e diminuir o tempo na CI/CD), arquivos que testavam componentes e fluxos removidos da aplicação foram descartados em prol de testes mais eficientes dentro dos fluxos reais:
- **Excluído `04-scroll-and-inpage-nav.spec.ts`**
- **Excluído `08-geoparquet-explorer.spec.ts`**
- **Excluído `09-dashboard-charts.spec.ts`**
- **Excluído `10-ui-enhancements.spec.ts`**
- **Novo Arquivo: `07-dashboard-features.spec.ts`** — Consolida e foca na verificação da extração de `.csv`, do funcionamento do `.js-plotly-plot` e do filtro de estados em vez de pulverizar validações.

---

## 3. Impacto e Build

- Suíte de regressão do Playwright passou a refletir 100% da UX final da v1.0.
- Menor tempo de teste. Testes executam mais rápido em CI.
- Fim dos erros falsos-positivos na validação do Pull Request.
