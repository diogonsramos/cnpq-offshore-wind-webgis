# f08 — tests & hardening (E2E, load, security, performance)

## Goal

Prepare the application for **production deployment on a datacenter VM with public multi-user internet access**. This goes beyond functional E2E tests to include load testing, security vulnerability scanning, dependency auditing, and infrastructure hardening.

---

## Part 1 — E2E regression tests

Add Playwright E2E tests for all untested functional areas: Map, Dashboard, SidePanel.

### Files to create

- `tests/e2e/06-map.spec.ts`
- `tests/e2e/07-dashboard.spec.ts`
- `tests/e2e/08-sidepanel.spec.ts`

### 06-map.spec.ts

| ID | What it validates |
|---|---|
| T30 | Map container visible after clicking "Abrir WebGIS Map" |
| T31 | SidePanel renders all selectors (model, experiment, variable, height, season) |
| T32 | Changing variable updates footer text |
| T33 | Basemap switcher visible with buttons |
| T34 | Clicking Satellite basemap changes active class |
| T35 | PixelInfoPanel shows "Click map to query" when idle |
| T36 | "Shapefiles de Batimetria" accordion expands on click |
| T37 | COG opacity slider exists and responds (after f01) |

### 07-dashboard.spec.ts

| ID | What it validates |
|---|---|
| T40 | Dashboard tab clickable |
| T41 | Empty state message visible before any location |
| T42 | Lat/Lon input fields present |
| T43 | Experiment selector enabled (after f01) |
| T44 | Model selector present (WRF/MPAS) |
| T45 | Variable selector switches options |
| T46 | Height selector shows 5 options (10–200m) |

### 08-sidepanel.spec.ts

| ID | What it validates |
|---|---|
| T50 | Header reads "CNPq WebGIS" |
| T51 | Modelo selector has 2 options |
| T52 | Experimento searchable opens on focus |
| T53 | Altura accordion collapses/expands |
| T54 | "Mostrar shapefiles" checkbox toggles radio group |
| T55 | FAQ button opens FAQ drawer |
| T56 | Project button opens Project Info drawer |
| T57 | FAQ drawer has >= 1 visible question |

---

## Part 2 — Load & stress testing

Simulate **multi-user concurrent access** to identify bottlenecks in the VM deployment.

### Tools to use

| Tool | Purpose |
|---|---|
| **k6** (or autocannon/artillery) | HTTP load testing — simulate 10, 50, 100 concurrent users |
| **Playwright** (parallel contexts) | Browser-level multi-user simulation (max 4–6 contexts per machine) |
| **CLI stress tools** | `stress --cpu 4 --io 2` on the VM to simulate resource contention |

### Test scenarios

Create `tests/load/load-test.js` (k6 script):

| Scenario | Users | Duration | Target |
|---|---|---|---|
| L01 — Landing page burst | 50 concurrent | 60s | Homepage HTML + static assets |
| L02 — Map tile warmup | 20 concurrent | 120s | Navigate to map, pan/zoom |
| L03 — Parquet download | 10 concurrent | 60s | Trigger parquet load by clicking map |
| L04 — CSV export flood | 30 concurrent | 30s | Dashboard + download CSV button |
| L05 — Mixed workload | 50 concurrent | 180s | 40% landing, 30% map, 20% dashboard, 10% CSV export |

### Metrics & thresholds

| Metric | Warning | Critical |
|---|---|---|
| P95 response time | > 2s | > 5s |
| Error rate | > 1% | > 5% |
| Memory per user session | > 50 MB | > 150 MB |
| CPU usage (VM) | > 60% | > 90% |
| Disk I/O wait | > 10% | > 30% |

### Deliverables

- [ ] `tests/load/load-test.js` — k6 script with all 5 scenarios
- [ ] `docs/BENCHMARKS.md` — results table with baseline metrics
- [ ] GitHub Actions workflow (optional) — run k6 on schedule to detect regressions

---

## Part 3 — Security testing

For a **public-facing application**, a manual checklist is insufficient. Use automated tools.

### 3.1 — Dependency auditing

| Tool | Command | What it finds |
|---|---|---|
| **npm audit** | `pnpm audit` | Known CVEs in direct and transitive dependencies |
| **Socket.dev** (or Snyk) | `npx socket` | Malware, typo-squatting, license risks |
| **Dependabot** (GitHub) | Enable in repo settings | Automated PRs for vulnerable deps |

Run `pnpm audit` and fix or document all findings. If a vulnerability has no patch, add a `.snyk` ignore rule with expiration date.

### 3.2 — Dynamic scanning (DAST)

| Tool | What it scans |
|---|---|
| **ZAP (Zed Attack Proxy)** | Running instance → crawl + active scan → generate HTML report |
| **Burp Suite (Community)** (optional) | Manual deep-dive on input fields (lat/lon, searchable select) |

Run ZAP baseline scan against `http://localhost:3000`:

```bash
docker run --rm -v $(pwd):/zap/wrk softwaresecurityproject/zap-stable \
  zap-baseline.py -t http://host.docker.internal:3000 -r zap-report.html
```

### 3.3 — Hardening checklist

| # | Check | How to verify |
|---|---|---|
| S01 | `Content-Security-Policy` header set | `vite.config.ts` / production server config |
| S02 | `X-Content-Type-Options: nosniff` | Response headers via curl |
| S03 | `Referrer-Policy: strict-origin-when-cross-origin` | Response headers |
| S04 | No secrets in client bundle | `rg -i "api_key\|secret\|token\|password" src/ public/` |
| S05 | No sensitive data in IndexedDB | Open DevTools → Application → IndexedDB; only parquet cache |
| S06 | Input sanitization (lat/lon) | Try `<script>alert(1)</script>` in lat/lon inputs — must be rejected |
| S07 | Rate limiting / DDoS protection | VM firewall or reverse proxy (nginx rate limit) — document in README |
| S08 | HTTPS enforced | Production deploy must terminate TLS; document cert renewal process |
| S09 | `Referrer-Policy` and `Permissions-Policy` | Add `<meta>` tags or server headers |
| S10 | CORS configuration | If API backend added later, restrict to known origins |

### 3.4 — OWASP Top 10 (2021) quick reference

| Category | Risk in this app | Mitigation |
|---|---|---|
| A01 — Broken Access Control | No auth system yet (public app) | Acceptable for MVP; add if admin features appear |
| A03 — Injection | Lat/lon inputs, searchable select | Input validation + output encoding |
| A05 — Security Misconfiguration | Vite dev server in prod | Ensure `NODE_ENV=production`, no source maps in prod |
| A06 — Vulnerable Components | npm dependencies | `pnpm audit` + Dependabot |
| A07 — Auth Failures | No user auth | N/A (public data) |
| A08 — Data Integrity Failures | COG/parquet served from local filesystem | Integrity verified at data pipeline stage (out of scope for frontend) |
| A09 — Logging & Monitoring | VM-level | Configure `systemd-journald` or equivalent |

---

## Part 4 — Single-user stability & console audit

### 09-stability.spec.ts

| ID | What it validates |
|---|---|
| T60 | Landing page full scroll: no `console.error` or uncaught exceptions |
| T61 | Map tab, wait 5s: no app errors (external tile 404s allowed) |
| T62 | Dashboard tab: no console errors |
| T63 | Toggle Map ↔ Dashboard 5×: memory growth < 10 MB |
| T64 | Toggle locale pt-BR/en (after f06): no console errors |
| T65 | Resize 1280 → 375 → 1280: no layout warnings |
| T66 | Trigger parquet load → dashboard → 3 pin adds: no memory leak (heap < 200 MB) |

### 10-performance.spec.ts

| ID | What it validates |
|---|---|
| T70 | Landing page load < 3s (fast 3G, `networkidle`) |
| T71 | Map tab JS bundle < 500 KB (after f04 lazy-load) |
| T72 | No render-blocking resources in critical path |
| T73 | Lighthouse Performance score > 80 (optional, requires Lighthouse CLI) |
| T74 | CSV export completes in < 1s for 3 locations |
| T75 | Plotly chart renders in < 500ms after data is available |

---

## Part 5 — Infrastructure documentation

Since the app runs on a **datacenter VM**, document:

- [ ] `docs/DEPLOY.md` — production deployment steps (nginx reverse proxy, PM2 or systemd, HTTPS cert)
- [ ] `docs/BENCHMARKS.md` — load test results table (updated after each major release)
- [ ] `docs/SECURITY.md` — security posture summary, audit history, vulnerability management process
- [ ] VM sizing recommendation (CPU, RAM, disk IOPS based on k6 results)
- [ ] Monitoring recommendation (Prometheus/node_exporter + Grafana or equivalent)

---

## Acceptance criteria

- [ ] All E2E tests (06–08) pass in Chromium headless
- [ ] Existing 41 tests still pass with 0 modifications
- [ ] `pnpm audit` reports 0 critical vulnerabilities (or documented exceptions)
- [ ] ZAP baseline scan produces report with 0 high-severity alerts
- [ ] k6 load test completes with error rate < 1% for 50 concurrent users
- [ ] All 10 hardening checklist items verified (S01–S10)
- [ ] `docs/DEPLOY.md`, `docs/BENCHMARKS.md`, `docs/SECURITY.md` created
- [ ] Total Playwright test count updated in `CLAUDE.md` and `docs/TODO.md`
- [ ] No console errors detected during stability E2E run

## Claude Code constraints

- No `any`, no `// @ts-ignore`
- k6 script: pure JavaScript (no TypeScript needed for load tests)
- Security fixes: do NOT introduce new dependencies unless absolutely required
- `docs/DEPLOY.md`: include nginx config snippet, `systemd` service file, `certbot` instructions
- ZAP scan: run manually (Docker) — not required to pass CI
- Do NOT modify existing Playwright test files (01–05) — only add new ones
