"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { requireAdminSession } from "@/lib/auth-server"
import { writeAuditEvent } from "@/lib/audit"
import { updateEntryReviewStatus } from "@/lib/entries/repo"
import type { ReviewStatus } from "@/lib/entries/types"

const schema = z.object({
  id: z.string().min(1),
  reviewStatus: z.enum(["normal", "needs_review"]),
})

export async function setReviewStatus(formData: FormData) {
  const session = await requireAdminSession()
  const id = String(formData.get("id") ?? "")
  const reviewStatus = String(formData.get("reviewStatus") ?? "")
  const parsed = schema.parse({ id, reviewStatus })

  await updateEntryReviewStatus({
    tenantId: session.tenantId,
    entryId: parsed.id,
    reviewStatus: parsed.reviewStatus as ReviewStatus,
  })

  await writeAuditEvent({
    tenant_id: session.tenantId,
    event: "LUNCH_ENTRY_STATUS_CHANGED",
    actor_type: "admin",
    actor_id: session.user.email ?? session.user.id,
    meta: { entry_id: parsed.id, review_status: parsed.reviewStatus },
  })

  redirect(`/admin/entries/${encodeURIComponent(parsed.id)}`)
}


