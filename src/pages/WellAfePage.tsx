import { Pencil } from "lucide-react"
import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { WellAfeDialog } from "@/components/wells/WellAfeDialog"
import { useAuth } from "@/hooks/useAuth"
import { useDeleteWellAfe, useUpsertWellAfe, useWellAfesQuery } from "@/hooks/useWellAfes"
import { useWellsQuery } from "@/hooks/useWells"
import { errorMessage } from "@/lib/utils"
import { buildCostCentreTotals, fmtCurrency } from "@/lib/wellCost"
import { wbsCodeOf } from "@/lib/wellCostBudgets"
import { WbsBudgetTable } from "@/components/wells/WbsBudgetTable"
import { useWellCostCentresQuery } from "@/hooks/useWellCostCentres"
import { useWellCostTransactionsQuery } from "@/hooks/useWellCostTransactions"
import { wellAfeRate, wellAfeTotal, type WellAfe } from "@/types/wellAfe"
import { toast } from "sonner"
import "./WellAfePage.css"

/** The AFE as a printable page, laid out like the Well AFE Form Templates artifact. Opened
 *  by clicking an AFE on the Cost Structure page. Editing goes through the same editor
 *  dialog, opened from the Edit button. */
export default function WellAfePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { can } = useAuth()
  const wellsQuery = useWellsQuery()
  const afesQuery = useWellAfesQuery()
  const upsertAfe = useUpsertWellAfe()
  const deleteAfe = useDeleteWellAfe()
  const wells = wellsQuery.data ?? []
  const afes = afesQuery.data ?? []
  const canEdit = can("edit", "well")
  const canDelete = can("delete", "well")

  const [pickedWellId, setPickedWellId] = useState<string | null>(null)
  const [pickedAfeId, setPickedAfeId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [wellSearch, setWellSearch] = useState("")
  const [wellOpen, setWellOpen] = useState(false)
  const [tab, setTab] = useState<"afe" | "breakup">("afe")
  const centresQuery = useWellCostCentresQuery()
  const transactionsQuery = useWellCostTransactionsQuery()
  const centres = centresQuery.data ?? []
  const transactions = transactionsQuery.data ?? []

  // Arriving from the Cost Structure page opens that well and AFE straight away.
  const requested = location.state as { wellId?: string; afeId?: string } | null
  const well = wells.find((w) => w.id === (pickedWellId ?? requested?.wellId)) ?? wells.find((w) => !w.archived) ?? null

  const visibleWells = useMemo(() => {
    const q = wellSearch.trim().toLowerCase()
    if (!q) return wells
    return wells.filter((w) => [w.name, w.code, w.field].some((v) => (v || "").toLowerCase().includes(q)))
  }, [wells, wellSearch])

  function pickWell(id: string) {
    setPickedWellId(id)
    setPickedAfeId(null)
    setWellSearch("")
    setWellOpen(false)
  }

  const wellAfes = useMemo(() => afes.filter((a) => a.wellId === well?.id), [afes, well?.id])
  const afe: WellAfe | null =
    wellAfes.find((a) => a.id === (pickedAfeId ?? requested?.afeId)) ?? wellAfes[0] ?? null

  const total = afe ? wellAfeTotal(afe) : 0
  const estimateTotal = afe ? afe.lines.reduce((s, l) => s + (Number(l.estimate) || 0), 0) : 0
  const contingencyTotal = afe ? afe.lines.reduce((s, l) => s + (Number(l.contingency) || 0), 0) : 0
  const rate = afe ? wellAfeRate(afe) : 0
  /** Converted values show whenever the AFE has them switched on, until someone reverts. */
  const showConverted = !!afe && afe.converted && rate > 0

  // Breakup tab: amounts in the currency the well's cost centres are kept in, and actual spend
  // per WBS code from the cost centres that roll up to it.
  const wellCentres = useMemo(() => centres.filter((c) => c.wellId === well?.id), [centres, well?.id])
  const wellCurrency = wellCentres[0]?.currency || "USD"
  const actualByCode = useMemo(() => {
    const costTotals = buildCostCentreTotals(transactions)
    const totals = new Map<string, number>()
    for (const c of wellCentres) {
      const code = wbsCodeOf(c.fundCentre)
      if (!code) continue
      totals.set(code, (totals.get(code) ?? 0) + (costTotals[c.id]?.actual ?? 0))
    }
    return totals
  }, [wellCentres, transactions])

  async function handleSaveAfe(next: WellAfe) {
    try {
      await upsertAfe.mutateAsync(next)
      toast.success(`AFE ${next.afeNo} saved.`)
    } catch (e) {
      toast.error(errorMessage(e, "Could not save AFE."))
      throw e
    }
  }

  async function handleDeleteAfe(next: WellAfe) {
    try {
      await deleteAfe.mutateAsync(next)
      toast.success(`AFE ${next.afeNo} deleted.`)
      setEditOpen(false)
      setPickedAfeId(null)
    } catch (e) {
      toast.error(errorMessage(e, "Could not delete AFE."))
    }
  }

  const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="afe-page">
      <main className={tab === "breakup" ? "is-wide" : undefined}>
        <div className="toolbar">
          <div className="afe-well-picker">
            <label>
              Well
              <div className="well-combo">
                <input
                  type="search"
                  role="combobox"
                  aria-label="Search wells"
                  aria-expanded={wellOpen}
                  autoComplete="off"
                  className="well-search"
                  placeholder="Type a well name, code or field…"
                  value={wellOpen || wellSearch ? wellSearch : well ? `${well.name}${well.code ? ` · ${well.code}` : ""}` : ""}
                  onChange={(e) => {
                    setWellSearch(e.target.value)
                    setWellOpen(true)
                  }}
                  onFocus={() => setWellOpen(true)}
                  onBlur={() => setWellOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setWellOpen(false)
                    if (e.key === "Enter" && visibleWells[0]) {
                      e.preventDefault()
                      pickWell(visibleWells[0].id)
                    }
                  }}
                />
                {wellOpen && (
                  <ul className="well-options" role="listbox">
                    {visibleWells.length ? (
                      visibleWells.map((w) => (
                        <li key={w.id}>
                          {/* mousedown, not click: the input's blur would close the list before a click lands. */}
                          <button
                            type="button"
                            role="option"
                            aria-selected={w.id === well?.id}
                            className={w.id === well?.id ? "selected" : undefined}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              pickWell(w.id)
                            }}
                          >
                            <span className="mono">{w.name}</span>
                            {w.code && <span className="muted">{w.code}</span>}
                            {w.field && <span className="muted">{w.field}</span>}
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="empty">No wells match “{wellSearch}”</li>
                    )}
                  </ul>
                )}
              </div>
            </label>
          </div>
          {wellAfes.length > 0 && (
            <label>
              AFE
              <select value={afe?.id ?? ""} onChange={(e) => setPickedAfeId(e.target.value)}>
                {wellAfes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.afeNo} ({a.afeType})
                  </option>
                ))}
              </select>
            </label>
          )}
          {well && (
            <button type="button" className="link-btn" onClick={() => navigate("/well-cost/structure", { state: { wellId: well.id } })}>
              Cost Structure
            </button>
          )}
          {afe && canEdit && (
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit AFE
            </Button>
          )}
        </div>

        {well && (
          <nav className="afe-tabs" aria-label="AFE views">
            <button type="button" className={tab === "afe" ? "afe-tab is-active" : "afe-tab"} aria-pressed={tab === "afe"} onClick={() => setTab("afe")}>
              Original AFE
            </button>
            <button type="button" className={tab === "breakup" ? "afe-tab is-active" : "afe-tab"} aria-pressed={tab === "breakup"} onClick={() => setTab("breakup")}>
              Cost structure breakup
            </button>
          </nav>
        )}

        <header>
          <div className="eyebrow">Well Cost · AFE</div>
          <h1 style={{ marginTop: 6 }}>Authorization for Expenditure (AFE)</h1>
          <p style={{ marginTop: 6 }}>
            {well ? `${well.name}${well.field ? `, ${well.field}` : ""}.` : "No well selected."} Figures are in the AFE currency unless a converted value is shown.
          </p>
        </header>

        {!well && <div className="empty">No wells yet. Add a well in the Well Registry first.</div>}

        {well && !afe && <div className="empty">No AFEs raised for {well.name} yet. Create one from the Cost Structure page.</div>}

        {well && tab === "breakup" && (
          <section className="card" aria-labelledby="breakup-title">
            <div className="head" style={{ marginBottom: 12 }}>
              <div>
                <span className="tag">Cost structure breakup</span>
                <h2 id="breakup-title" style={{ marginTop: 8 }}>
                  Budget by WBS code, {well.name}
                </h2>
              </div>
            </div>
            {wellAfes.length === 0 ? (
              <div className="empty">No AFEs raised for {well.name} yet.</div>
            ) : (
              <div className="afe-breakup">
                <WbsBudgetTable wellId={well.id} afes={afes} currency={wellCurrency} actualByCode={actualByCode} />
              </div>
            )}
          </section>
        )}

        {well && afe && tab === "afe" && (
          <section className="card" aria-labelledby="afe-title">
            <div className="head">
              <div>
                <span className="tag">Signed form</span>
                <h2 id="afe-title" style={{ marginTop: 8 }}>
                  AFE No. {afe.afeNo}
                </h2>
              </div>
              <span className={afe.status === "Approved" || afe.status === "Closed" ? "tag" : "tag warn"}>Status: {afe.status}</span>
            </div>

            <div className="grid-fields">
              <div className="field">
                <span className="label">Well name</span>
                <span className="value mono">{well.name}</span>
              </div>
              <div className="field">
                <span className="label">Field / area</span>
                <span className="value">{well.field || "—"}</span>
              </div>
              <div className="field">
                <span className="label">Well code</span>
                <span className="value mono">{well.code || "—"}</span>
              </div>
              <div className="field">
                <span className="label">Operator</span>
                <span className="value">{well.operator || "—"}</span>
              </div>
              <div className="field">
                <span className="label">AFE type</span>
                <span className="value">{afe.afeType}</span>
              </div>
              <div className="field">
                <span className="label">Currency</span>
                <span className="value">{afe.currency}</span>
              </div>
              <div className="field">
                <span className="label">Prepared on</span>
                <span className="value">{afe.preparedOn || "—"}</span>
              </div>
              <div className="field">
                <span className="label">Approved on</span>
                <span className="value">{afe.approvedOn || "—"}</span>
              </div>
              <div className="field">
                <span className="label">Approval limit</span>
                <span className="value">{afe.approvalLimit === "" ? "—" : fmtCurrency(afe.approvalLimit, afe.currency)}</span>
              </div>
              <div className="field">
                <span className="label">Preferred currency</span>
                <span className="value">
                  {afe.preferredCurrency}
                  {afe.currency !== afe.preferredCurrency && afe.conversionRate !== "" && (
                    <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
                      {" "}
                      (1 {afe.currency} = {afe.conversionRate} {afe.preferredCurrency})
                    </span>
                  )}
                </span>
              </div>
              {afe.notes && (
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <span className="label">Notes</span>
                  <span className="value">{afe.notes}</span>
                </div>
              )}
            </div>

            <h2 style={{ marginTop: 22 }}>Cost estimate by WBS code</h2>
            <div className="wrap">
              <table>
                <thead>
                  <tr>
                    <th>WBS code</th>
                    <th>Description</th>
                    <th className="num">Estimate ({afe.currency})</th>
                    <th className="num">Contingency</th>
                    <th className="num">Total ({afe.currency})</th>
                    {showConverted && <th className="num">Total ({afe.preferredCurrency})</th>}
                  </tr>
                </thead>
                <tbody>
                  {afe.lines.map((l) => {
                    const lineTotal = (Number(l.estimate) || 0) + (Number(l.contingency) || 0)
                    return (
                      <tr key={l.id}>
                        <td className="mono">{l.code || "—"}</td>
                        <td className="desc">{l.description || "—"}</td>
                        <td className="num">{l.estimate === "" ? "—" : fmt2(Number(l.estimate))}</td>
                        <td className="num">{l.contingency === "" ? "—" : fmt2(Number(l.contingency))}</td>
                        <td className="num">{fmt2(lineTotal)}</td>
                        {showConverted && <td className="num">{fmt2(lineTotal * rate)}</td>}
                      </tr>
                    )
                  })}
                  <tr className="total">
                    <td colSpan={2}>Total AFE</td>
                    <td className="num">{fmt2(estimateTotal)}</td>
                    <td className="num">{fmt2(contingencyTotal)}</td>
                    <td className="num">{fmt2(total)}</td>
                    {showConverted && <td className="num">{fmt2(total * rate)}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="note">
              Contingency is set per cost line. Each WBS code is the code from the project's work breakdown, so actuals can be matched to the same line.
            </p>
            {showConverted && (
              <p className="summary">
                <strong>
                  {fmtCurrency(total, afe.currency)} = {fmtCurrency(total * rate, afe.preferredCurrency)}
                </strong>{" "}
                <span style={{ color: "var(--muted)" }}>
                  at 1 {afe.currency} = {rate} {afe.preferredCurrency}
                </span>
              </p>
            )}

            <h2 style={{ marginTop: 22 }}>Approvals</h2>
            <div className="sign">
              <div>
                <span className="label">Prepared</span>
                <small>Drilling Engineer · {afe.preparedOn || "date"}</small>
              </div>
              <div>
                <span className="label">Reviewed</span>
                <small>Operations Manager · date</small>
              </div>
              <div>
                <span className="label">Finance</span>
                <small>Finance Manager · date</small>
              </div>
              <div>
                <span className="label">Approved</span>
                <small>
                  Managing Director · {afe.approvedOn || "date"}
                  {afe.approvalLimit !== "" && ` · limit ${fmtCurrency(afe.approvalLimit, afe.currency)}`}
                </small>
              </div>
            </div>
          </section>
        )}

        {editOpen && well && afe && (
          <WellAfeDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            wellId={well.id}
            wellName={well.name}
            afes={wellAfes}
            canEdit={canEdit}
            canDelete={canDelete}
            saving={upsertAfe.isPending}
            initialAfeId={afe.id}
            onSave={handleSaveAfe}
            onDelete={handleDeleteAfe}
          />
        )}
      </main>
    </div>
  )
}
