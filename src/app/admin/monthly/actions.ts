"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { env } from "@/env"
import { requireAdminSession } from "@/lib/auth-server"
import { listEntriesByMonth } from "@/lib/entries/repo"
import { aggregateMonthly } from "@/lib/monthly/aggregate"
import { exportBatchId, markExportExecuted, upsertPreviewExport } from "@/lib/monthly/repo"

const schema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
})

export async function previewMonthlyExport(formData: FormData) {
  const session = await requireAdminSession()
  const yearMonth = String(formData.get("yearMonth") ?? "")
  const parsed = schema.parse({ yearMonth })

  const entries = await listEntriesByMonth({ tenantId: session.tenantId, yearMonth: parsed.yearMonth })
  const agg = aggregateMonthly({ yearMonth: parsed.yearMonth, entries })

  await upsertPreviewExport({
    tenant_id: session.tenantId,
    year_month: parsed.yearMonth,
    export_batch_id: exportBatchId(session.tenantId, parsed.yearMonth),
    payload: {
      subsidy_unit_yen: env.SUBSIDY_UNIT_YEN,
      monthly_limit_yen: env.MONTHLY_LIMIT_YEN,
      total_entries: agg.totalEntries,
      total_subsidy_yen: agg.totalSubsidyYen,
      by_employee: agg.byEmployee.map((r) => ({
        employee_id: r.employeeId.toString(),
        entries: r.entries,
        subsidy_yen: r.subsidyYen,
        needs_review_entries: r.needsReviewEntries,
      })),
    },
  })

  redirect(`/admin/monthly?yearMonth=${encodeURIComponent(parsed.yearMonth)}`)
}

export async function executeMonthlyExport(formData: FormData) {
  const session = await requireAdminSession()
  const yearMonth = String(formData.get("yearMonth") ?? "")
  const parsed = schema.parse({ yearMonth })

  // MVP: mark as executed in DB.
  // freee draft creation will be integrated here once OAuth tokens are available.
  await markExportExecuted({ exportBatchId: exportBatchId(session.tenantId, parsed.yearMonth) })

  redirect(`/admin/monthly?yearMonth=${encodeURIComponent(parsed.yearMonth)}&executed=1`)
}


