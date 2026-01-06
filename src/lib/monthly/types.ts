import type { ObjectId } from "mongodb"

export type WelfareBalanceStatus = "open" | "fixed"

export type WelfareBalanceDoc = {
  _id: ObjectId
  tenant_id: string
  employee_id: ObjectId
  year_month: string // YYYY-MM
  used_subsidy_amount: number
  limit_amount: number
  status: WelfareBalanceStatus
  calculated_at: Date
}

export type FreeeExportStatus = "preview" | "executed" | "error"

export type FreeeExportDoc = {
  _id: ObjectId
  tenant_id: string
  year_month: string // YYYY-MM
  export_batch_id: string // tenant_id:YYYY-MM
  status: FreeeExportStatus
  created_at: Date
  executed_at?: Date
  error_message?: string

  // Snapshot of what we intended to export (MVP)
  payload: {
    subsidy_unit_yen: number
    monthly_limit_yen: number
    total_entries: number
    total_subsidy_yen: number
    by_employee: Array<{
      employee_id: string
      entries: number
      subsidy_yen: number
      needs_review_entries: number
    }>
  }

  // freee draft reference (optional)
  freee_object_id?: string
  freee_draft_url?: string
}


