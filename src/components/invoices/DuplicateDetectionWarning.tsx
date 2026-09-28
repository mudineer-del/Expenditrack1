import { AlertCircle, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fmtMoney } from "@/lib/dashboard"
import type { DuplicateMatch } from "@/lib/duplicateDetection"

export function DuplicateDetectionWarning({
  matches,
  onIgnore,
}: {
  matches: DuplicateMatch[]
  onIgnore: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  if (!matches.length) return null

  const highConfidence = matches.filter((m) => m.confidence === "high")
  const mediumConfidence = matches.filter((m) => m.confidence === "medium")

  return (
    <Alert className={cn("border-l-4 border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100")}>
      <AlertCircle className="size-4" />
      <AlertTitle>Potential Duplicate Detected</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          <p className="text-sm">
            This invoice may already exist in your system ({matches.length} potential match
            {matches.length !== 1 ? "es" : ""}).
          </p>

          {expanded && (
            <div className="mt-3 space-y-2">
              {highConfidence.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">High Confidence Matches:</p>
                  {highConfidence.map((match) => (
                    <div key={match.invoice.id} className="mt-1 rounded bg-amber-100 p-2 text-xs dark:bg-amber-900/30">
                      <p className="font-medium">{match.reason}</p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Invoice #{match.invoice.srNo} - {match.invoice.vendor} - {fmtMoney(match.invoice.amountInclTax)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {mediumConfidence.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Medium Confidence Matches:</p>
                  {mediumConfidence.map((match) => (
                    <div key={match.invoice.id} className="mt-1 rounded bg-amber-100 p-2 text-xs dark:bg-amber-900/30">
                      <p className="font-medium">{match.reason}</p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Invoice #{match.invoice.srNo} - {match.invoice.vendor} - {fmtMoney(match.invoice.amountInclTax)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-2 text-xs italic">
                Review the existing invoice before saving. If this is different, you can ignore this warning.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
              {expanded ? "Hide" : "Show"} Details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={onIgnore}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
