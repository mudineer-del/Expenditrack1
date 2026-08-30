export interface Well {
  id: string
  name: string
  code: string
  field: string
  operator: string
  status: string
  archived: boolean
  startDate: string
  description: string
}

export type WellRow = Record<string, unknown> & { id: string }

export function toWellRow(w: Well): WellRow {
  return {
    id: String(w.id),
    name: w.name || null,
    code: w.code || null,
    field: w.field || null,
    operator: w.operator || null,
    status: w.status || "Planned",
    archived: !!w.archived,
    start_date: w.startDate || null,
    description: w.description || null,
  }
}

export function fromWellRow(row: WellRow): Well {
  return {
    id: String(row.id),
    name: (row.name as string) || "",
    code: (row.code as string) || "",
    field: (row.field as string) || "",
    operator: (row.operator as string) || "",
    status: (row.status as string) || "Planned",
    archived: !!row.archived,
    startDate: (row.start_date as string) || "",
    description: (row.description as string) || "",
  }
}

export function blankWell(): Well {
  return {
    id: crypto.randomUUID(),
    name: "",
    code: "",
    field: "",
    operator: "",
    status: "Planned",
    archived: false,
    startDate: "",
    description: "",
  }
}
