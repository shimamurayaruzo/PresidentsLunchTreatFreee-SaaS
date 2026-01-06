import type { ObjectId } from "mongodb"

export type ReviewStatus = "normal" | "needs_review"

export type LunchEntryDoc = {
  _id: ObjectId
  tenant_id: string
  employee_id: ObjectId
  device_id: ObjectId

  entry_date: string // YYYY-MM-DD
  year_month: string // YYYY-MM
  site_name: string
  total_amount: number
  note?: string

  photo_hash: string // sha256 hex
  photo_drive_file_id: string
  photo_url: string
  photo_mime: string

  review_status: ReviewStatus
  created_at: Date
}


