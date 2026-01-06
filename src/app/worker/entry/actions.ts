"use server"

import crypto from "node:crypto"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createLunchEntry, findDuplicateByPhotoHash } from "@/lib/entries/repo"
import { uploadLunchPhotoToDrive } from "@/lib/drive"
import { logger } from "@/lib/logger"
import { writeAuditEvent } from "@/lib/audit"
import { requireWorkerContext } from "@/lib/worker-auth"

const schema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  siteName: z.string().min(1),
  totalAmount: z.coerce.number().int().min(0),
  note: z.string().optional(),
})

export async function submitLunchEntry(formData: FormData) {
  const ctx = await requireWorkerContext()
  if (!ctx) redirect("/pairing")

  const entryDate = String(formData.get("entryDate") ?? "")
  const siteName = String(formData.get("siteName") ?? "")
  const totalAmount = formData.get("totalAmount")
  const note = String(formData.get("note") ?? "").trim() || undefined
  const photo = formData.get("photo")

  const parsed = schema.parse({
    entryDate,
    siteName,
    totalAmount,
    note,
  })

  let photoHash: string | undefined
  let photoDriveFileId: string | undefined
  let photoUrl: string | undefined
  let photoMime: string | undefined

  // Hackathon quick mode: photo is optional. If provided, try to upload; if it fails, still accept the entry.
  if (photo instanceof File && photo.type.startsWith("image/")) {
    try {
      const bytes = Buffer.from(await photo.arrayBuffer())
      photoHash = crypto.createHash("sha256").update(bytes).digest("hex")
      photoMime = photo.type

      const dup = await findDuplicateByPhotoHash({ tenantId: ctx.tenantId, photoHash })
      const filenameSafeDate = parsed.entryDate.replaceAll("-", "")
      const filename = `lunch_${filenameSafeDate}_${ctx.employeeId.toString()}_${crypto.randomUUID()}.jpg`

      const uploaded = await uploadLunchPhotoToDrive({
        filename,
        mimeType: photo.type,
        bytes,
      })

      photoDriveFileId = uploaded.fileId
      photoUrl = uploaded.webViewLink

      const reviewStatus = dup ? "needs_review" : "normal"

      const entry = await createLunchEntry({
        tenantId: ctx.tenantId,
        employeeId: ctx.employeeId,
        deviceId: ctx.deviceId,
        entryDate: parsed.entryDate,
        siteName: parsed.siteName,
        totalAmount: parsed.totalAmount,
        note: parsed.note,
        photoHash,
        photoDriveFileId,
        photoUrl,
        photoMime,
        reviewStatus,
      })

      logger.info("lunch entry created", {
        tenant_id: ctx.tenantId,
        employee_id: ctx.employeeId.toString(),
        entry_id: entry._id.toString(),
        review_status: reviewStatus,
        has_photo: true,
      })

      await writeAuditEvent({
        tenant_id: ctx.tenantId,
        event: "LUNCH_ENTRY_CREATED",
        actor_type: "worker",
        actor_id: ctx.employeeId.toString(),
        meta: {
          entry_id: entry._id.toString(),
          year_month: entry.year_month,
          review_status: reviewStatus,
          has_photo: true,
        },
      })

      redirect(`/worker/entry?success=1&review=${reviewStatus}`)
    } catch (e) {
      logger.warn("photo upload failed; accepting entry without photo", {
        tenant_id: ctx.tenantId,
        employee_id: ctx.employeeId.toString(),
        err: e,
      })
      // fall through to no-photo submission
    }
  }

  // No photo submission: always mark as needs_review to prompt accounting verification.
  const reviewStatus = "needs_review"
  const entry = await createLunchEntry({
    tenantId: ctx.tenantId,
    employeeId: ctx.employeeId,
    deviceId: ctx.deviceId,
    entryDate: parsed.entryDate,
    siteName: parsed.siteName,
    totalAmount: parsed.totalAmount,
    note: parsed.note,
    reviewStatus,
  })

  logger.info("lunch entry created", {
    tenant_id: ctx.tenantId,
    employee_id: ctx.employeeId.toString(),
    entry_id: entry._id.toString(),
    review_status: reviewStatus,
    has_photo: false,
  })

  await writeAuditEvent({
    tenant_id: ctx.tenantId,
    event: "LUNCH_ENTRY_CREATED",
    actor_type: "worker",
    actor_id: ctx.employeeId.toString(),
    meta: {
      entry_id: entry._id.toString(),
      year_month: entry.year_month,
      review_status: reviewStatus,
      has_photo: false,
    },
  })

  redirect(`/worker/entry?success=1&review=${reviewStatus}`)
}


