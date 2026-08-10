export interface Contract {
  id: string
  contractNo: string
  vendor: string
  title: string
  value: number | ""
  startDate: string
  endDate: string
  status: string
}

export type ContractRow = Record<string, unknown> & { id: string }

/**
 * Ground truth is the `contracts` table schema in OGDCL_Supabase_Setup.sql:
 * id, contract_no, vendor, title, value, start_date, end_date, status.
 * The legacy app's blankContract() (index.html:4224) also had local-only
 * `service`/`notes` fields that its own sbUpsertContracts() never actually
 * sent to Supabase (they don't exist as columns) — dropped here rather than
 * carried forward, since they never persisted in the first place.
 */
export function toContractRow(c: Contract): ContractRow {
  return {
    id: String(c.id),
    contract_no: c.contractNo || null,
    vendor: c.vendor || null,
    title: c.title || null,
    value: c.value === "" ? null : Number(c.value) || 0,
    start_date: c.startDate || null,
    end_date: c.endDate || null,
    status: c.status || null,
  }
}

export function fromContractRow(row: ContractRow): Contract {
  return {
    id: String(row.id),
    contractNo: (row.contract_no as string) || "",
    vendor: (row.vendor as string) || "",
    title: (row.title as string) || "",
    value: row.value === null || row.value === undefined ? "" : Number(row.value),
    startDate: (row.start_date as string) || "",
    endDate: (row.end_date as string) || "",
    status: (row.status as string) || "",
  }
}

export function blankContract(): Contract {
  return {
    id: crypto.randomUUID(),
    contractNo: "",
    vendor: "",
    title: "",
    value: "",
    startDate: "",
    endDate: "",
    status: "Active",
  }
}
