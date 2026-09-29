import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { Invoice } from "../types"
import { fmtMoney, groupBy, monthlyTrend } from "../lib/data"

const PIE_COLORS = ["#0d6b3f", "#2f9e6b", "#6cc6a0", "#e0a53f", "#c8563f", "#4c6ef5", "#9c6ade", "#495057"]

export function Dashboard({ invoices }: { invoices: Invoice[] }) {
  const totalExpenditure = useMemo(() => invoices.reduce((s, i) => s + i.amount, 0), [invoices])
  const totalPaid = useMemo(() => invoices.reduce((s, i) => s + i.paid, 0), [invoices])
  const byService = useMemo(() => groupBy(invoices, "service").slice(0, 8), [invoices])
  const trend = useMemo(() => monthlyTrend(invoices).slice(-12), [invoices])

  return (
    <div className="view-pad">
      <div className="kpi-grid">
        <div className="kpi-tile">
          <div className="kpi-label">Invoices logged</div>
          <div className="kpi-value">{invoices.length.toLocaleString()}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Total expenditure</div>
          <div className="kpi-value">{fmtMoney(totalExpenditure)}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Amount paid</div>
          <div className="kpi-value">{fmtMoney(totalPaid)}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value">{fmtMoney(totalExpenditure - totalPaid)}</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Monthly Expenditure</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trend}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => fmtMoney(v).replace(".00", "")} width={56} />
            <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="total" fill="#0d6b3f" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <div className="chart-title">Expenditure by Service</div>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Pie data={byService} dataKey="total" nameKey="label" innerRadius="45%" outerRadius="80%" paddingAngle={2}>
              {byService.map((d, i) => (
                <Cell key={d.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="legend">
          {byService.map((d, i) => (
            <div className="legend-item" key={d.label}>
              <span className="legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              {d.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
