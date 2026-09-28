import type { Invoice } from "@/types/invoice"

export interface DuplicateMatch {
  invoice: Invoice
  matchType: "invoiceNo" | "amountAndVendor" | "amountAndDate"
  confidence: "high" | "medium" | "low"
  reason: string
}

/**
 * Detect potential duplicate invoices based on various criteria.
 * Returns matches sorted by confidence (high to low).
 */
export function detectDuplicates(
  newInvoice: Partial<Invoice>,
  existingInvoices: Invoice[],
  excludeInvoiceId?: string
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []

  for (const existing of existingInvoices) {
    if (excludeInvoiceId && existing.id === excludeInvoiceId) {
      continue
    }

    // Exact invoice number match (high confidence)
    if (
      newInvoice.invoiceNo &&
      existing.invoiceNo &&
      newInvoice.invoiceNo.toLowerCase().trim() === existing.invoiceNo.toLowerCase().trim()
    ) {
      matches.push({
        invoice: existing,
        matchType: "invoiceNo",
        confidence: "high",
        reason: `Exact invoice number match: ${newInvoice.invoiceNo}`,
      })
      continue
    }

    // Same vendor + same amount + same date (high confidence)
    if (
      newInvoice.vendor &&
      newInvoice.amountInclTax &&
      newInvoice.invoiceDate &&
      existing.vendor === newInvoice.vendor &&
      existing.amountInclTax === newInvoice.amountInclTax &&
      existing.invoiceDate === newInvoice.invoiceDate
    ) {
      matches.push({
        invoice: existing,
        matchType: "amountAndDate",
        confidence: "high",
        reason: `Same vendor, amount, and date: ${newInvoice.vendor} - ${newInvoice.amountInclTax}`,
      })
      continue
    }

    // Same vendor + same amount (medium confidence)
    if (
      newInvoice.vendor &&
      newInvoice.amountInclTax &&
      existing.vendor === newInvoice.vendor &&
      existing.amountInclTax === newInvoice.amountInclTax
    ) {
      const daysDiff = calculateDaysDifference(existing.invoiceDate, newInvoice.invoiceDate)
      if (daysDiff !== null && daysDiff <= 7) {
        matches.push({
          invoice: existing,
          matchType: "amountAndVendor",
          confidence: "medium",
          reason: `Same vendor and amount within ${daysDiff} days`,
        })
      }
    }
  }

  // Sort by confidence
  const confidenceOrder = { high: 0, medium: 1, low: 2 }
  return matches.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence])
}

function calculateDaysDifference(date1?: string, date2?: string): number | null {
  if (!date1 || !date2) return null

  try {
    const d1 = new Date(date1)
    const d2 = new Date(date2)

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null

    return Math.abs(Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
  } catch {
    return null
  }
}
