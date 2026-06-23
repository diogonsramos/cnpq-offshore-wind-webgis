# CLAUDE.md — Instruções de Desenvolvimento

Diretrizes obrigatórias para qualquer implementação neste projeto, seja por assistente de IA ou por desenvolvedor humano.

---

## Stack e convenções

- **React 18 + TypeScript** — sem `any`, sem `// @ts-ignore`
- **Vite 6** — assets estáticos em `public/`; arquivos de `public/images/logos/` referenciados via `import.meta.env.BASE_URL`
- **CSS modular** — cada componente novo com escopo próprio (ex: `LandingPage.css` importado dentro de `LandingPage.tsx`); não adicionar estilos de componentes em `App.css`
- **Estado global** centralizado em `App.tsx` via `useState`; sem Zustand, Redux ou Context desnecessários
- **Sem react-router-dom** — navegação entre telas gerenciada por `useState<TabId>` em `App.tsx`
- **Sem comentários óbvios** — só comentar WHY não-óbvio; nunca o WHAT

### Arquivos de referência

| Fonte de verdade | Conteúdo |
|---|---|
| `docs/INFO_PROJECT.md` | Metadados oficiais do projeto (equipe, publicações, parâmetros técnicos, citação) |
| `docs/TODO.md` | Roadmap por fases — o que está feito, o que está pendente e em qual fase |
| `src/lib/cogCatalog.ts` | Catálogo de experimentos, variáveis, alturas e caminhos de COG |
| `src/lib/metadata.ts` | Textos do FAQ e painel de Informações do Projeto |

---

## Testes de regressão E2E

### O que são

Testes **end-to-end de regressão** verificam que funcionalidades já implementadas continuam funcionando após cada nova mudança no código. Eles simulam o navegador real (Chromium headless via Playwright) e interagem com a UI exatamente como um usuário faria.

Não confundir com:
- **Testes A/B** — comparam duas variantes para medir comportamento de usuário (não usamos aqui)
- **Testes unitários** — testam funções isoladas (ainda não implementados neste projeto)

### Estrutura dos testes

```
tests/
└── e2e/
    ├── 01-landing-page.spec.ts           # Conteúdo, seções e interações da landing page
    ├── 02-navigation.spec.ts             # Navegação entre landing e sistema (CTAs, gallery cards, ← Home)
    ├── 03-responsiveness.spec.ts         # Layout responsivo em 3 breakpoints
    └── 04-scroll-and-inpage-nav.spec.ts  # Scroll vertical, âncoras in-page, botão "Voltar ao topo"
```

Cada arquivo cobre um contexto funcional. Novos contextos (ex: mapa, dashboard, FAQ) ganham **novos arquivos** numerados em sequência: `05-map.spec.ts`, `06-dashboard.spec.ts`, etc.

### Convenções de nomenclatura

- IDs de teste seguem o padrão `T##` quando referenciados no `docs/TODO.md`
- Descrições no formato `T## — o que valida` dentro de `test('...')`
- `test.describe()` agrupa por contexto lógico (ex: `'Navegação: Landing → Sistema'`)
- `test.beforeEach()` para setup comum ao grupo (ex: `page.goto('/')`)

### Configuração (`playwright.config.ts`)

- **Base URL:** `http://localhost:3000`
- **Dev server:** iniciado automaticamente por `webServer` com `reuseExistingServer: true` (se já estiver rodando, reutiliza)
- **Browser:** Chromium (único projeto configurado; adicionar Firefox/Safari conforme necessidade)
- **Artefatos:** screenshots de falha e traces em `tests/results/` (ignorado pelo git)

---

## Comandos para rodar os testes

```bash
# Instalar browsers do Playwright (apenas na primeira vez)
pnpm exec playwright install chromium

# Suite completa: type check TypeScript + todos os testes E2E
# Rodar obrigatoriamente antes de qualquer entrega
pnpm test

# Apenas verificação de tipos (rápido, sem browser)
pnpm test:types

# Apenas testes E2E com Playwright
pnpm test:e2e

# Interface visual interativa — para depurar um teste específico
pnpm test:e2e:ui

# Rodar apenas um arquivo de testes
pnpm test:e2e tests/e2e/02-navigation.spec.ts

# Rodar apenas testes que correspondam a um padrão de nome
pnpm test:e2e --grep "T04"
```

### Saída esperada (suite completa — 31 testes)

```
31 passed (~14 s)
```

Qualquer número diferente de `31 passed` indica falha ou teste faltando. Investigate antes de continuar.

---

## Regra obrigatória: toda entrega deve ter testes atualizados

> **Nenhuma implementação é considerada concluída sem testes de regressão passando.**

### O que fazer ao implementar algo novo

1. **Implementar** a feature normalmente
2. **Verificar** se algum teste existente quebrou: `pnpm test`
   - Se quebrou → corrigir o código **ou** atualizar o teste se o comportamento mudou intencionalmente
3. **Criar novos testes** para a feature implementada:
   - Se for um novo contexto funcional (ex: mapa interativo) → criar `tests/e2e/04-map.spec.ts`
   - Se for uma extensão de contexto existente (ex: novo botão na navbar) → adicionar `test()` no arquivo correspondente
4. **Rodar a suite completa** e confirmar que todos passam: `pnpm test`
5. **Atualizar `docs/TODO.md`** — seção de especificações da fase, tabela de testes com IDs e resultados

### O que testar para cada tipo de mudança

| Tipo de mudança | O que testar |
|---|---|
| Novo componente de UI | Visibilidade, contagem de elementos, textos corretos |
| Nova rota/tela | Navegação até ela, elementos ausentes antes da navegação |
| Novo botão/CTA | Clique executa a ação esperada; estado correto após o clique |
| Mudança de layout | Sem scroll horizontal nos 3 breakpoints (375 / 768 / 1280 px) |
| Novo dado estático (equipe, publicação) | Contagem atualizada nos testes correspondentes |
| Remoção de elemento | Atualizar ou remover o teste que verificava o elemento |
| Mudança de seletor CSS | Atualizar seletores nos testes afetados |

### O que NÃO testar via E2E (por ora)

- Lógica interna de `cogTileRenderer.ts` ou `pixelQuery.ts` — requer testes unitários (Fase futura)
- Renderização correta de tiles do mapa — requer comparação visual ou mock de rede
- Performance de carregamento do GeoParquet — requer benchmark separado (ver `docs/TODO.md` Fase 6)

---

## Checklist de entrega

Antes de considerar qualquer tarefa concluída, verificar:

- [ ] `pnpm test` passa com **0 falhas**
- [ ] Novos testes criados para as features implementadas
- [ ] `docs/TODO.md` atualizado com: itens marcados `[x]`, tabela de testes, arquivos modificados
- [ ] Nenhum `console.error` ou warning novo no browser durante os testes
- [ ] Se um pacote foi instalado: listado no `docs/TODO.md` (seção de especificações da fase) e justificado
