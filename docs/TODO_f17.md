# ROADMAP_UX_SEC.md (Fase 17)

## Objetivo da F17
Integrar ferramentas de automação, experiência do usuário (UX), acessibilidade e segurança para garantir alta qualidade e resiliência em ambientes acadêmicos e de P&D do WebGIS.

## Estratégia de Branches
- **Feature Principal**: `feat/f17-ux-sec-automation` (Branch guarda-chuva)
- **Sub-branches**:
  1. `test/f17-playwright-screenshots`: Configuração e automação de capturas de tela reprodutíveis (Playwright).
  2. `feat/f17-driverjs-onboarding`: Substituição/evolução do guia interativo utilizando Driver.js.
  3. `chore/f17-audit-lighthouse-axe`: Implementação de auditoria contínua de performance e acessibilidade.
  4. `security/f17-owasp-codeql`: Varredura e configuração de segurança no CI/CD e aplicação (ZAP + CodeQL).

## Roadmap de Implementação

### 1. Automação de Capturas de Tela (Playwright)
- **Objetivo**: Garantir uma pipeline confiável para capturar o estado do WebGIS e Landing Page para fins de documentação, manual e changelog.
- **Ferramentas**: Playwright.
- **Critério de Aceite (DoD)**: Os scripts devem conseguir extrair a tela cheia e recortes de componentes específicos sem instabilidade (flakiness), com tempo de espera (timeout) otimizado e rodando automaticamente via CLI.

### 2. Guia Interativo de Onboarding (Driver.js)
- **Objetivo**: Fornecer um tour moderno, com destaque (highlight) no DOM, para ensinar o uso do WebGIS.
- **Ferramentas**: Driver.js (versão atualizada).
- **Critério de Aceite (DoD)**: O tour funciona suavemente guiando o usuário entre Mapa e Dashboard, não atrapalha interações do usuário, e a flag de completude fica salva no `localStorage` para não reaparecer após o primeiro uso.

### 3. Auditoria de Boas Práticas e Acessibilidade (Lighthouse + Axe-core)
- **Objetivo**: Detectar gargalos de renderização, contraste e semântica HTML.
- **Ferramentas**: Lighthouse CI, Axe-core / cypress-axe ou jest-axe.
- **Critério de Aceite (DoD)**: O sistema atinge nota mínima de 90 em Acessibilidade e Performance no Lighthouse. Ausência de violações críticas reportadas pelo Axe-core no terminal.

### 4. Varredura de Segurança (OWASP ZAP + CodeQL)
- **Objetivo**: Blindar a aplicação contra injeções, dependências vulneráveis e problemas de XSS.
- **Ferramentas**: OWASP ZAP (ZAP Baseline Scan), GitHub CodeQL.
- **Critério de Aceite (DoD)**: O CodeQL está configurado na pasta `.github/workflows/` rodando nos PRs, e não há alertas críticos no OWASP ZAP referentes à interface pública servida pelo Vite.
