import type { Invoice } from "@/types/invoice"

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return parseFloat(value) || 0
  return 0
}

export interface DuplicateMatch {
  invoices: Invoice[]
  confidence: "high" | "medium" | "low"
  reason: string
}

/** Find potential duplicate invoices in the database. */
export function findDuplicates(invoices: Invoice[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []
  const seen = new Set<string>()

  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i]
      const b = invoices[j]
      const pairKey = [a.id, b.id].sort().join("-")

      if (seen.has(pairKey)) continue

      const match = findDuplicateMatch(a, b)
      if (match) {
        seen.add(pairKey)
        matches.push(match)
      }
    }
  }

  return matches.sort((a) => (a.confidence === "high" ? -1 : 1))
}

/** Check if two invoices are likely duplicates. */
function findDuplicateMatch(a: Invoice, b: Invoice): DuplicateMatch | null {
  if (!a || !b) return null

  // Exact match: vendor + invoice number + amount
  if (
    normalize(a.vendor) === normalize(b.vendor) &&
    normalize(a.invoiceNo) === normalize(b.invoiceNo) &&
    toNumber(a.amountExclTax) === toNumber(b.amountExclTax)
  ) {
    return {
      invoices: [a, b],
      confidence: "high",
      reason: `Same vendor, invoice #, and amount ($${a.amountExclTax})`,
    }
  }

  // Vendor + invoice number (amount might differ due to import)
  if (
    normalize(a.vendor) === normalize(b.vendor) &&
    normalize(a.invoiceNo) === normalize(b.invoiceNo)
  ) {
    const aAmt = toNumber(a.amountExclTax)
    const bAmt = toNumber(b.amountExclTax)
    const amtDiff = Math.abs(aAmt - bAmt)
    const pct = (amtDiff / Math.max(aAmt || 1, bAmt || 1)) * 100
    if (pct <= 5) {
      return {
        invoices: [a, b],
        confidence: "high",
        reason: `Same vendor and invoice #, amounts differ by ${pct.toFixed(1)}%`,
      }
    }
  }

  // Fuzzy vendor match + invoice number
  const vendorSim = stringSimilarity(normalize(a.vendor), normalize(b.vendor))
  if (
    vendorSim >= 0.9 &&
    normalize(a.invoiceNo) === normalize(b.invoiceNo)
  ) {
    return {
      invoices: [a, b],
      confidence: "medium",
      reason: `Similar vendor name and same invoice #`,
    }
  }

  // Same vendor, similar invoice number, same date (potential re-entry)
  if (
    normalize(a.vendor) === normalize(b.vendor) &&
    stringSimilarity(normalize(a.invoiceNo), normalize(b.invoiceNo)) >= 0.85 &&
    String(a.invoiceDate || "") === String(b.invoiceDate || "") &&
    toNumber(a.amountExclTax) > 0
  ) {
    return {
      invoices: [a, b],
      confidence: "medium",
      reason: `Same vendor and date, similar invoice #`,
    }
  }

  return null
}

function normalize(value: unknown): string {
  return String(value || "").trim().toLowerCase()
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/** Merge two invoices, keeping the one with more complete data. */
export function mergeInvoices(primary: Invoice, secondary: Invoice): Invoice {
  const merged = { ...primary }

  // Copy over any missing fields from secondary
  for (const key of Object.keys(secondary) as Array<keyof Invoice>) {
    const secValue = secondary[key]
    const priValue = merged[key]

    // If primary is missing this field or it's empty, use secondary's value
    if (
      (priValue === undefined || priValue === "" || priValue === null) &&
      (secValue !== undefined && secValue !== "" && secValue !== null)
    ) {
      (merged[key] as any) = secValue
    }
  }

  return merged
}
