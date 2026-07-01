export interface ExtractedIssuer {
  issuer?: string
  cuit?: string
}

interface IssuerCandidate {
  raw: string
  normalized: string
  index: number
  count: number
}

const LEGAL_SUFFIX_PATTERN =
  "(?:S\\.?\\s*A\\.?\\s*C\\.?\\s*I\\.?\\s*F\\.?|S\\.?\\s*A\\.?\\s*S\\.?|S\\.?\\s*R\\.?\\s*L\\.?|S\\.?\\s*C\\.?\\s*A\\.?|S\\.?\\s*C\\.?\\s*S\\.?|S\\.?\\s*A\\.?)"

const ISSUER_PATTERN = new RegExp(
  `\\b[\\p{L}\\d][\\p{L}\\d&.'-]*(?:\\s+[\\p{L}\\d][\\p{L}\\d&.'-]*){0,8}\\s+${LEGAL_SUFFIX_PATTERN}(?=$|[\\s,.;:)])`,
  "giu",
)

const CUIT_PATTERN = /\b(?:CUIT|C\.?U\.?I\.?T\.?)?\s*[:#-]?\s*(\d{2}[-\s]?\d{8}[-\s]?\d)\b/giu

const CONNECTORS = new Set(["de", "del", "la", "las", "el", "los", "y", "e"])
const SECTION_WORDS = new Set([
  "estado",
  "estados",
  "situacion",
  "patrimonial",
  "activo",
  "pasivo",
  "patrimonio",
  "resultado",
  "resultados",
  "ejercicio",
  "notas",
  "anexo",
])

export function extractIssuerFromText(text: string): ExtractedIssuer {
  const candidates = collectIssuerCandidates(text)
  const issuer = chooseIssuer(candidates)
  const cuit = extractNearestCuit(text, issuer)

  return {
    ...(issuer?.raw && { issuer: formatIssuerName(issuer.raw) }),
    ...(cuit && { cuit }),
  }
}

function collectIssuerCandidates(text: string): IssuerCandidate[] {
  const grouped = new Map<string, IssuerCandidate>()

  for (const match of text.matchAll(ISSUER_PATTERN)) {
    const raw = cleanupCandidate(match[0])
    if (!isUsefulCandidate(raw)) continue

    const normalized = normalizeKey(raw)
    const existing = grouped.get(normalized)
    if (existing) {
      existing.count += 1
      continue
    }

    grouped.set(normalized, {
      raw,
      normalized,
      index: match.index ?? 0,
      count: 1,
    })
  }

  return [...grouped.values()]
}

function chooseIssuer(candidates: IssuerCandidate[]): IssuerCandidate | undefined {
  return candidates
    .sort((a, b) => {
      const scoreDiff = scoreCandidate(b) - scoreCandidate(a)
      if (scoreDiff !== 0) return scoreDiff
      return a.index - b.index
    })[0]
}

function scoreCandidate(candidate: IssuerCandidate): number {
  const words = normalizeWords(candidate.raw)
  const sectionPenalty = words.filter((word) => SECTION_WORDS.has(word)).length * 3
  const legalBonus = /\bS\s*A\b|\bS\s*R\s*L\b|\bS\s*A\s*S\b/.test(candidate.normalized) ? 3 : 0
  return candidate.count * 6 + legalBonus - sectionPenalty
}

function extractNearestCuit(text: string, issuer?: IssuerCandidate): string | undefined {
  const cuits = [...text.matchAll(CUIT_PATTERN)]
    .map((match) => ({
      value: normalizeCuit(match[1]),
      index: match.index ?? 0,
    }))
    .filter((match) => Boolean(match.value))

  if (cuits.length === 0) return undefined
  if (!issuer) return cuits[0].value

  return cuits.sort((a, b) => Math.abs(a.index - issuer.index) - Math.abs(b.index - issuer.index))[0]?.value
}

function cleanupCandidate(value: string): string {
  return value
    .replace(/^(?:\d{2}[-\s]?\d{8}[-\s]?\d\s+)+/, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:()]+|[\s.,;:()]+$/g, "")
    .trim()
}

function isUsefulCandidate(value: string): boolean {
  const words = normalizeWords(value)
  if (words.length < 2) return false
  if (words.every((word) => SECTION_WORDS.has(word))) return false
  return true
}

function formatIssuerName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word, index) => {
      const suffix = formatLegalSuffix(word)
      if (suffix) return suffix

      const lower = word.toLocaleLowerCase("es-AR")
      if (index > 0 && CONNECTORS.has(lower)) return lower
      return lower.replace(/^\p{L}/u, (char) => char.toLocaleUpperCase("es-AR"))
    })
    .join(" ")
    .replace(/\bS\s*\.\s*A\s*\.\s*C\s*\.\s*I\s*\.\s*F\s*\.?/giu, "S.A.C.I.F.")
    .replace(/\bS\s*\.\s*A\s*\.\s*S\s*\.?/giu, "S.A.S.")
    .replace(/\bS\s*\.\s*R\s*\.\s*L\s*\.?/giu, "S.R.L.")
    .replace(/\bS\s*\.\s*C\s*\.\s*A\s*\.?/giu, "S.C.A.")
    .replace(/\bS\s*\.\s*C\s*\.\s*S\s*\.?/giu, "S.C.S.")
    .replace(/\bS\s*\.\s*A\s*\.?/giu, "S.A.")
}

function formatLegalSuffix(word: string): string | undefined {
  const normalized = word.replace(/[^a-z]/gi, "").toUpperCase()
  const map: Record<string, string> = {
    SA: "S.A.",
    SRL: "S.R.L.",
    SAS: "S.A.S.",
    SCA: "S.C.A.",
    SCS: "S.C.S.",
    SACIF: "S.A.C.I.F.",
  }
  return map[normalized]
}

function normalizeCuit(value: string): string | undefined {
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 11) return undefined
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\d]+/gu, " ")
    .trim()
    .toUpperCase()
}

function normalizeWords(value: string): string[] {
  return normalizeKey(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}
