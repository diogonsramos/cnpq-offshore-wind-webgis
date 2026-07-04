import { ptBR } from './pt-BR'

export function t(key: string, vars?: Record<string, string | number>): string {
  let str = ptBR[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{{${k}}}`, String(v))
  }
  return str
}
