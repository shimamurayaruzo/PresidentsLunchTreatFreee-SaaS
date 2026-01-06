import type { ObjectId } from "mongodb"

import { env } from "@/env"
import type { LunchEntryDoc } from "@/lib/entries/types"

export type MonthlyEmployeeAgg = {
  employeeId: ObjectId
  entries: number
  needsReviewEntries: number
  subsidyYen: number
}

export type MonthlyAgg = {
  yearMonth: string
  totalEntries: number
  totalSubsidyYen: number
  byEmployee: MonthlyEmployeeAgg[]
}

export function aggregateMonthly(input: { yearMonth: string; entries: LunchEntryDoc[] }): MonthlyAgg {
  const byEmployee = new Map<string, { employeeId: ObjectId; entries: number; needs: number }>()
  for (const e of input.entries) {
    const key = e.employee_id.toString()
    const cur = byEmployee.get(key) ?? { employeeId: e.employee_id, entries: 0, needs: 0 }
    cur.entries += 1
    if (e.review_status === "needs_review") cur.needs += 1
    byEmployee.set(key, cur)
  }

  const unit = env.SUBSIDY_UNIT_YEN
  const limit = env.MONTHLY_LIMIT_YEN

  const rows: MonthlyEmployeeAgg[] = Array.from(byEmployee.values()).map((r) => {
    const raw = r.entries * unit
    const subsidyYen = Math.min(raw, limit)
    return { employeeId: r.employeeId, entries: r.entries, needsReviewEntries: r.needs, subsidyYen }
  })

  const totalEntries = input.entries.length
  const totalSubsidyYen = rows.reduce((sum, r) => sum + r.subsidyYen, 0)

  rows.sort((a, b) => b.subsidyYen - a.subsidyYen)

  return { yearMonth: input.yearMonth, totalEntries, totalSubsidyYen, byEmployee: rows }
}


