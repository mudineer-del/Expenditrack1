import { useMemo } from "react"
import type { Contract, Invoice } from "../types"
import { fmtMoney, groupBy } from "../lib/data"

export function Reports({ invoices, contracts }: { invoices: Invoice[]; contracts: Contract[] }) {
  const byVendor = useMemo(() => groupBy(invoices, "vendor").slice(0, 15), [invoices])
  const byDepartment = useMemo(() => groupBy(invoices, "department"), [invoices])
  const contractsValue = useMemo(() => contracts.reduce((s, c) => s + (Number(c.value) || 0), 0), [contracts])
  const invoicedValue = useMemo(() => invoices.reduce((s, i) => s + i.amount, 0), [invoices])

  return (
    <div className="view-pad">
      <div className="kpi-grid">
        <div className="kpi-tile">
          <div className="kpi-label">Active contracts</div>
          <div className="kpi-value">{contracts.length}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Contracted value</div>
          <div className="kpi-value">{fmtMoney(contractsValue)}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Invoiced value</div>
          <div className="kpi-value">{fmtMoney(invoicedValue)}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Utilization</div>
          <div className="kpi-value">{contractsValue ? Math.round((invoicedValue / contractsValue) * 100) : 0}%</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Top vendors by expenditure</div>
        <table className="report-table">
          <tbody>
            {byVendor.map((v) => (
              <tr key={v.label}>
                <td>{v.label}</td>
                <td className="report-table-count">{v.count}</td>
                <td className="report-table-amount">{fmtMoney(v.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-card">
        <div className="chart-title">Expenditure by department</div>
        <table className="report-table">
          <tbody>
            {byDepartment.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td className="report-table-count">{d.count}</td>
                <td className="report-table-amount">{fmtMoney(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
