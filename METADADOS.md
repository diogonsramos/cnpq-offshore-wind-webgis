# Metadados do Projeto — WebGIS CNPq

## Como editar o conteúdo do WebGIS

Edite o arquivo **`src/lib/metadata.ts`** e os componentes `FAQPanel.tsx` e `ProjectInfoPanel.tsx` serão atualizados automaticamente.

### O que cada seção controla

| Seção | Arquivo | Constante |
|-------|---------|-----------|
| FAQ (20 perguntas) | `src/lib/metadata.ts` | `FAQS` — array de `{ q, a }` |
| Financiamento | `src/lib/metadata.ts` | `PROJECT_INFO.funding` |
| Resumo Técnico | `src/lib/metadata.ts` | `PROJECT_INFO.techSummary` — array de `{ label, value }` |
| Equipe | `src/lib/metadata.ts` | `PROJECT_INFO.team` |
| Publicações | `src/lib/metadata.ts` | `PROJECT_INFO.publications` — array de strings |
| Contato | `src/lib/metadata.ts` | `PROJECT_INFO.contact` |

### Instruções

1. Abra `src/lib/metadata.ts`
2. Edite os textos diretamente nas strings
3. Salve e o WebGIS em `pnpm dev` atualiza automaticamente (HMR)
