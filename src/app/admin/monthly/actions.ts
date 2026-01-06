"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { env } from "@/env"
import { requireAdminSession } from "@/lib/auth-server"
import { listEntriesByMonth } from "@/lib/entries/repo"
import { createDraftDeal } from "@/lib/freee"
import { writeAuditEvent } from "@/lib/audit"
import { aggregateMonthly } from "@/lib/monthly/aggregate"
import { exportBatchId, findExportByBatchId, markExportError, markExportExecuted, upsertPreviewExport } from "@/lib/monthly/repo"

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

  const batchId = exportBatchId(session.tenantId, parsed.yearMonth)
  const exportDoc = await findExportByBatchId({ exportBatchId: batchId })
  if (!exportDoc) {
    redirect(`/admin/monthly?yearMonth=${encodeURIComponent(parsed.yearMonth)}&error=no_preview`)
  }

  try {
    const companyId = env.FREEE_COMPANY_ID ? Number(env.FREEE_COMPANY_ID) : NaN
    if (!Number.isFinite(companyId)) throw new Error("FREEE_COMPANY_ID is not set")

    const issueDate = `${parsed.yearMonth}-01`
    const description = `【社長ランチごちします】月次まとめ ${parsed.yearMonth}\n件数:${exportDoc.payload.total_entries} 補助合計:${exportDoc.payload.total_subsidy_yen}円\n※下書き。最終判断は経理。`

    const created = (await createDraftDeal({
      companyId,
      issueDate,
      amount: exportDoc.payload.total_subsidy_yen,
      description,
    })) as { deal?: { id?: number | string } } | { deal_id?: number | string } | { id?: number | string }

    const dealId =
      "deal" in created ? created.deal?.id : "deal_id" in created ? created.deal_id : "id" in created ? created.id : undefined
    await markExportExecuted({
      exportBatchId: batchId,
      freeeObjectId: dealId ? String(dealId) : undefined,
      freeeDraftUrl: dealId ? `https://secure.freee.co.jp/a/company/${companyId}/deals/${dealId}` : undefined,
    })

    await writeAuditEvent({
      tenant_id: session.tenantId,
      event: "MONTHLY_EXPORT_EXECUTED",
      actor_type: "admin",
      actor_id: session.user.email ?? session.user.id,
      meta: { year_month: parsed.yearMonth, freee_object_id: dealId ? String(dealId) : undefined },
    })
  } catch (e) {
    await markExportError({ exportBatchId: batchId, message: e instanceof Error ? e.message : String(e) })
    redirect(`/admin/monthly?yearMonth=${encodeURIComponent(parsed.yearMonth)}&error=freee`)
  }

  redirect(`/admin/monthly?yearMonth=${encodeURIComponent(parsed.yearMonth)}&executed=1`)
}


