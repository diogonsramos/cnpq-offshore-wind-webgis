# Plano de Implementação — Fase 1: Landing Page

> **Referência de conteúdo:** `docs/INFO_PROJECT.md`
> **Roadmap de origem:** `docs/TODO.md` — Seção 1 (Landing Page)
> **Estado atual do código:** React 18 + Vite 6, sem roteamento. O app abre diretamente na aba `map` com `TabBar` fixo no topo.

---

## 1. Visão Geral da Mudança Arquitetural

### Situação atual

```
App.tsx
 └── TabBar (tabs: 'map' | 'dashboard')
 └── tab === 'map'  → SidePanel + MapView + PixelInfoPanel
 └── tab === 'dashboard' → DashboardView
```

O `TabId` em `TabBar.tsx` só conhece `'map'` e `'dashboard'`. O estado inicial em `App.tsx` é `useState<TabId>('map')`, ou seja, o mapa carrega imediatamente ao abrir o sistema.

### Situação-alvo

```
App.tsx
 └── tab === 'home'  → LandingPage (sem TabBar)
 └── tab !== 'home' → TabBar + (map ou dashboard)
```

A Landing Page substitui o carregamento direto do mapa. Os dois CTAs da hero section alteram o estado de `tab` para `'map'` ou `'dashboard'`, navegando para dentro do sistema.

### Decisão de roteamento

**Não adicionar react-router-dom.** O sistema é uma SPA simples com três "telas" gerenciadas por um único `useState`. Adicionar um router introduziria histórico de URL, links compartilháveis e complexidade de sincronização de estado desnecessários para o MVP da landing page. A lógica de navegação já existente (troca de `TabId`) é suficiente. Se futuramente for necessário (deep-linking, SEO, múltiplas URLs), o refator para react-router é direto.

---

## 2. Arquivos a Criar

### 2.1. `src/components/LandingPage.tsx`

Componente principal da landing page. Não recebe nada além de `onNavigate: (tab: 'map' | 'dashboard') => void`.

Estrutura de seções (ordem vertical):

```
<LandingPage>
  <NavbarTop />          ← logos + link "Entrar no Sistema"
  <HeroSection />        ← título + subtítulo + dois CTAs
  <StatsStrip />         ← 4–5 números-chave em cards horizontais
  <TechSummarySection /> ← resumo técnico em duas colunas: texto + tabela
  <ScenariosSection />   ← cards dos 4 experimentos (ERA5_atlas, HIST, SSP2-4.5, SSP5-8.5)
  <GallerySection />     ← placeholder de screenshots (imagens do sistema)
  <TeamSection />        ← grid de pesquisadores
  <PublicationsSection /> ← lista de publicações
  <FooterSection />      ← logos institucionais + citação + disclaimer
</LandingPage>
```

### 2.2. `src/components/LandingPage.css`

Estilos exclusivos da landing page. Importado dentro de `LandingPage.tsx` (não em `App.css`, para manter isolamento). Deve usar as mesmas variáveis de cor do sistema:

| Variável de cor | Valor | Uso |
|---|---|---|
| `#1a1a2e` | Azul-escuro | Fundo navbar, textos principais |
| `#4a90d9` | Azul primário | CTAs, links, destaques |
| `#357abd` | Azul escuro (hover) | Estados :hover dos botões |
| `#f0f2f5` | Cinza-claro | Fundo de seções alternadas |
| `#fff` | Branco | Fundo de cards |

---

## 3. Arquivos a Modificar

### 3.1. `src/components/TabBar.tsx`

**Mudança 1 — Adicionar `'home'` ao tipo `TabId`:**

```typescript
// ANTES
export type TabId = 'map' | 'dashboard'

// DEPOIS
export type TabId = 'home' | 'map' | 'dashboard'
```

**Mudança 2 — O `TabBar` não deve renderizar a aba `'home'`** (ela nunca aparece no menu interno). O array `TABS` continua com apenas `map` e `dashboard`. Nenhuma outra mudança no componente.

---

### 3.2. `src/App.tsx`

**Mudança 1 — Estado inicial padrão `'home'`:**

```typescript
// ANTES
const [tab, setTab] = useState<TabId>('map')

// DEPOIS
const [tab, setTab] = useState<TabId>('home')
```

**Mudança 2 — Renderização condicional da LandingPage:**

O `TabBar` e os painéis internos só devem aparecer quando `tab !== 'home'`. Estrutura do JSX após a mudança:

```tsx
return (
  <div className="app">
    {tab === 'home' ? (
      <LandingPage onNavigate={setTab} />
    ) : (
      <>
        <TabBar tab={tab} onChange={setTab} />
        <div className="tab-panel" style={{ display: tab === 'map' ? 'flex' : 'none' }}>
          {/* conteúdo do mapa — sem alteração */}
        </div>
        <div className="tab-panel" style={{ display: tab === 'dashboard' ? 'flex' : 'none' }}>
          {/* conteúdo do dashboard — sem alteração */}
        </div>
      </>
    )}
    {showFAQ && <FAQPanel onClose={() => setShowFAQ(false)} />}
    {showProject && <ProjectInfoPanel onClose={() => setShowProject(false)} />}
  </div>
)
```

**Mudança 3 — Import do novo componente:**

```typescript
import LandingPage from './components/LandingPage'
```

---

### 3.3. `src/App.css`

Não requer mudanças estruturais. O layout `.app { display: flex; flex-direction: column; height: 100%; }` já suporta o novo fluxo porque a `LandingPage` usará `overflow-y: auto` próprio.

**Única adição necessária:** remover `overflow: hidden` do `html, body, #root` quando o tab for `'home'`, pois a landing page precisa de scroll. Isso deve ser feito via classe dinâmica no `div.app`:

```tsx
<div className={`app ${tab === 'home' ? 'app--landing' : ''}`}>
```

```css
/* Em App.css */
.app--landing {
  overflow-y: auto;
  height: auto;
  min-height: 100%;
}
```

---

## 4. Conteúdo Detalhado por Seção

### 4.1. NavbarTop

- **Esquerda:** Logo `docs/logo-peob-cnpq.png` + `docs/logo-cnpq.png`
- **Direita:** Botão `← Entrar no Sistema` (outline, aciona `onNavigate('map')`)
- Fundo: `#1a1a2e`, altura: 56px, sticky no topo durante scroll

---

### 4.2. HeroSection

- **Título principal (H1):**
  > Cenário atual e futuro do recurso eólico offshore no Brasil

- **Subtítulo:**
  > Ferramentas e aplicações — Projeto CNPq 407949/2022-4

- **Linha de contexto:**
  > Downscaling dinâmico WRF-ARW v4 (~9 km) forçado por ERA5 e CMIP6 (SSP2-4.5 e SSP5-8.5) para mapear vento e densidade de potência eólica em 5 altitudes na costa brasileira.

- **CTA 1 — primário (azul sólido):**
  `Abrir WebGIS Map` → `onNavigate('map')`

- **CTA 2 — secundário (outline azul):**
  `Abrir Analytical Dashboard` → `onNavigate('dashboard')`

- **Fundo:** gradiente `linear-gradient(135deg, #1a1a2e 60%, #2a3a6e)`, texto branco

---

### 4.3. StatsStrip

5 cards numéricos horizontais. Fonte de dados: `docs/INFO_PROJECT.md` — Seção 4.

| Rótulo | Valor |
|---|---|
| Modelo atmosférico | WRF-ARW v4 |
| Resolução horizontal | 9 km (D02) |
| Alturas de saída | 10 · 50 · 100 · 150 · 200 m |
| Experimentos | 4 (ERA5_atlas, HIST, SSP2-4.5, SSP5-8.5) |
| Estados costeiros cobertos | 17 |

Layout: `display: flex; flex-wrap: wrap; justify-content: center; gap: 16px`. Cada card tem borda superior colorida `#4a90d9`.

---

### 4.4. TechSummarySection

**Coluna esquerda — Texto:**
> O projeto realiza o mapeamento do potencial eólico offshore brasileiro utilizando simulações climáticas regionais de alta resolução, considerando cenários atuais e futuros de mudanças climáticas...
> *(texto completo em `docs/INFO_PROJECT.md` — Seção 4)*

**Coluna direita — Tabela de parâmetros técnicos** (extraída de `docs/INFO_PROJECT.md` — Seção 4):

| Indicador | Valor |
|---|---|
| Modelo atmosférico | WRF-ARW v4 |
| Domínios aninhados | D01: 27 km; D02: 9 km |
| Pontos de grade (D02) | 388 × 553 (~214.000 células) |
| Grade regridada (frontend) | 534 × 263 (~140.000 células) |
| Níveis verticais | 51 |
| Variáveis (frontend) | `ws` (m/s), `wpd` (W/m²) |
| Volume bruto | ~1,7 TB em NetCDF |
| Produtos processados | ~5.688 COGs; 24 GeoParquet |

Layout: `display: grid; grid-template-columns: 1fr 1fr; gap: 48px`. Responsivo: single column abaixo de 768px.

---

### 4.5. ScenariosSection

4 cards, um por experimento. Fonte: `docs/INFO_PROJECT.md` — Seção 7.2.

| Experimento | Forçante | Período | Descrição curta |
|---|---|---|---|
| ERA5_atlas | ERA5 | 2004–2024 | Reanálise — cenário atual de referência |
| HIST | ERA5 | 2004–2014 | Histórico — base para correção de viés |
| SSP2-4.5 | CMIP6 (18 modelos) | 2015–2023 + 2030–2050 | Mitigação moderada |
| SSP5-8.5 | CMIP6 (18 modelos) | 2015–2023 + 2030–2050 | Emissões elevadas |

Cada card: ícone simbólico, nome do experimento em destaque, forçante, período, descrição. Fundo: branco com borda `#e0e0e0`. Hover: borda `#4a90d9` com sombra leve.

---

### 4.6. GallerySection

3–4 imagens em grade (screenshots reais do sistema ou placeholders). Estrutura:

```tsx
<div className="gallery-grid">
  {/* placeholder enquanto screenshots não forem tirados */}
  <div className="gallery-placeholder">WebGIS Map — Velocidade do Vento (ERA5_atlas)</div>
  <div className="gallery-placeholder">Dashboard — Perfil Vertical</div>
  <div className="gallery-placeholder">Dashboard — Weibull</div>
</div>
```

Quando screenshots forem adicionados, colocar em `public/images/screenshots/` e referenciar via `import.meta.env.BASE_URL + 'images/screenshots/...'`.

---

### 4.7. TeamSection

Grid de cards com nome e função. Fonte completa: `docs/INFO_PROJECT.md` — Seção 2.

```
Davidson Martins Moreira — Coordenador
Diogo Nunes da Silva Ramos — Pesquisador Líder
Allan Rodrigues Silva — Pesquisador Líder
[... demais 14 membros]
```

Layout: `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`. Card minimal: nome em negrito, função em cinza. Coordenador e pesquisadores líderes recebem badge colorida.

---

### 4.8. PublicationsSection

Lista das 9 publicações em `docs/INFO_PROJECT.md` — Seção 12. Renderizar como `<ol>` com estilo acadêmico. Fonte 12px, cor `#444`, line-height 1.6. Título da seção: "Publicações Científicas".

---

### 4.9. FooterSection

**Linha 1 — Logos institucionais (centralizadas, altura fixa 48px):**
- `docs/logo-cnpq.png`
- `docs/logo-peob-cnpq.png`
- `docs/logo-senai-cimatec.png`

**Linha 2 — Citação:**
```
Cenário atual e futuro do recurso eólico offshore no Brasil: ferramentas e aplicações.
Projeto 407949/2022-4. Coordenação: Davidson Martins Moreira.
CS2I — SENAI CIMATEC, Salvador, BA, Brasil.
```

**Linha 3 — Disclaimer (em destaque amarelo suave):**
> ⚠️ Os dados disponíveis neste sistema são **preliminares**, para fins de desenvolvimento. Os dados finais (otimizados em formato e performance) serão atualizados posteriormente.

**Linha 4 — Copyright:**
```
© 2024–2026 CS2I — SENAI CIMATEC. Financiado pelo CNPq — Processo 407949/2022-4.
```

Fundo: `#1a1a2e`, texto `#aaa`.

---

## 5. Sequência de Implementação (Etapas)

### Etapa 1 — Preparação dos tipos (5 min)

1. Editar `src/components/TabBar.tsx`: adicionar `'home'` ao `TabId`.
2. Editar `src/App.tsx`: mudar `useState<TabId>('map')` para `useState<TabId>('home')` e adicionar classe `app--landing`.
3. Editar `src/App.css`: adicionar `.app--landing { overflow-y: auto; height: auto; min-height: 100%; }`.

> **Verificação:** O sistema deve abrir em tela branca (componente inexistente ainda). Nenhum erro de TypeScript.

---

### Etapa 2 — Esqueleto do componente (10 min)

1. Criar `src/components/LandingPage.tsx` com todas as seções como `<section>` com texto estático placeholder (`<h2>TODO: ...</h2>`).
2. Criar `src/components/LandingPage.css` com variáveis de cor e reset básico para `.landing`.
3. Conectar `onNavigate` nos dois CTAs.
4. Importar e renderizar em `App.tsx`.

> **Verificação:** O sistema abre na landing page. Os botões "Abrir WebGIS Map" e "Abrir Analytical Dashboard" funcionam. O mapa e dashboard permanecem funcionais após navegar para eles.

---

### Etapa 3 — NavbarTop e HeroSection (20 min)

1. Implementar `NavbarTop` com logos (`<img src="/docs/logo-cnpq.png" />` — os logos estão em `docs/`, precisam ser copiados para `public/images/` para serem servidos pelo Vite).
   - **Ação necessária:** copiar `docs/logo-*.png` para `public/images/logos/`.
2. Implementar `HeroSection` com gradiente, título, subtítulo, parágrafo descritivo e os dois botões CTA.

> **Verificação visual:** Hero responsivo, botões funcionais, logos carregando corretamente.

---

### Etapa 4 — StatsStrip e TechSummarySection (20 min)

1. Implementar os 5 cards de números-chave.
2. Implementar seção de resumo técnico em duas colunas com tabela de parâmetros.
3. Responsividade: single column em telas < 768px.

---

### Etapa 5 — ScenariosSection (15 min)

1. Definir array de objetos de experimentos localmente no componente.
2. Renderizar 4 cards com `Array.map`.

---

### Etapa 6 — GallerySection (10 min)

1. Implementar grid de placeholders com estilo visual de card escuro.
2. Deixar comentário indicando onde substituir por `<img>` real quando screenshots estiverem disponíveis.

---

### Etapa 7 — TeamSection (15 min)

1. Definir array de `{ name, role }` com os 17 membros da `docs/INFO_PROJECT.md`.
2. Renderizar grid auto-fill com badge de destaque para coordenador/líderes.

---

### Etapa 8 — PublicationsSection (10 min)

1. Definir array de strings com as 9 publicações.
2. Renderizar `<ol>` estilizada.

---

### Etapa 9 — FooterSection (15 min)

1. Implementar logos, citação, disclaimer e copyright.
2. Copiar os três arquivos de logo para `public/images/logos/` se ainda não feito na Etapa 3.

---

### Etapa 10 — Polimento e responsividade (20 min)

1. Testar em viewport 1280px, 768px e 375px.
2. Garantir que nenhuma seção cause scroll horizontal.
3. Verificar transição da landing page para o mapa (sem flash branco, sem reset de estado dos filtros).
4. Verificar que o TabBar não aparece na landing page.
5. Verificar que FAQ e ProjectInfo ainda funcionam quando acessados pelo mapa.

---

## 6. Dependências e Restrições

| Item | Status | Ação |
|---|---|---|
| `react-router-dom` | **Não necessário** | Navegação via `useState` existente |
| Logos institucionais | Disponíveis em `docs/` | Copiar para `public/images/logos/` |
| Screenshots do sistema | **Não disponíveis ainda** | Usar placeholders na Galeria |
| Dados de conteúdo | Em `docs/INFO_PROJECT.md` | Copiar textos e tabelas diretamente |
| Estilos existentes | `src/App.css` | Não alterar classes existentes — apenas adicionar `.app--landing` |

---

## 7. O que NÃO faz parte desta fase

Os itens abaixo estão no `TODO.md` mas pertencem a outras fases — **não implementar aqui**:

- Bug do mapa cinza (Fase 2 — item 2.2)
- Botão fechar no painel direito (Fase 2 — item 2.2)
- Gráficos avançados: wind rose, heatmap, radar, Weibull dinâmica (Fase 2 — item 2.3)
- Backend FastAPI + DuckDB (Fase 3)
- Persistência de estado entre abas (Fase 2 — item 2.1)

---

## 8. Referências de Conteúdo

| Seção da landing | Seção do `INFO_PROJECT.md` |
|---|---|
| Título oficial | Seção 1 — Metadados |
| Resumo técnico / hero | Seção 4 — Resumo Técnico |
| Tabela de parâmetros | Seção 4 — Números principais |
| Configuração WRF | Seção 5.1 |
| Experimentos e cenários | Seção 7.2 |
| Ensemble CMIP6 | Seção 7.4 |
| Equipe | Seção 2 |
| Fomento | Seção 3 |
| Publicações | Seção 12 |
| Citação | Seção 13 |
| Logos | Seção 3 (caminhos: `docs/logo-*.png`) |
