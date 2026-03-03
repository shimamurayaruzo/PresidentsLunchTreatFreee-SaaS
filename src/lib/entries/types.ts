import type { ObjectId } from "mongodb"

export type ReviewStatus = "normal" | "needs_review"

/** AI photo validation result stored alongside the entry */
export type AiValidationResult = {
  /** Whether the photo shows a valid meal/bento */
  is_valid_meal: boolean
  /** What the AI detected in the photo */
  detected_category: "bento" | "restaurant" | "convenience_store" | "drink_only" | "receipt" | "unrelated" | "unclear"
  /** Human-readable explanation in Japanese for accounting staff */
  reason: string
  /** Short description of what's in the photo */
  description: string
  /** Flags for accounting attention */
  flags: string[]
}

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

  // Hackathon quick mode: photo is optional
  photo_hash?: string // sha256 hex
  photo_drive_file_id?: string
  photo_url?: string
  photo_mime?: string

  // AI photo validation result
  ai_validation?: AiValidationResult

  review_status: ReviewStatus
  created_at: Date
}
