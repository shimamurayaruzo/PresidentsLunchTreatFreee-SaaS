"use server"

import crypto from "node:crypto"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createLunchEntry, findDuplicateByPhotoHash } from "@/lib/entries/repo"
import type { AiValidationResult } from "@/lib/entries/types"
import { uploadLunchPhotoToDrive } from "@/lib/drive"
import { validatePhoto } from "@/lib/ai-photo-analysis"
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

  // AI validation JSON from client-side pre-validation
  const aiValidationRaw = String(formData.get("aiValidation") ?? "").trim()
  let aiValidation: AiValidationResult | undefined
  if (aiValidationRaw) {
    try {
      aiValidation = JSON.parse(aiValidationRaw) as AiValidationResult
    } catch {
      // ignore invalid JSON
    }
  }

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

  // Photo processing
  if (photo instanceof File && photo.type.startsWith("image/")) {
    try {
      const bytes = Buffer.from(await photo.arrayBuffer())
      photoHash = crypto.createHash("sha256").update(bytes).digest("hex")
      photoMime = photo.type

      // If no AI validation was passed from client, do server-side validation
      if (!aiValidation) {
        try {
          const base64 = bytes.toString("base64")
          const result = await validatePhoto(base64, photo.type)
          if (result) aiValidation = result
        } catch (e) {
          logger.warn("server-side AI photo validation failed", { err: e })
        }
      }

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

      // Determine review status
      let reviewStatus: "normal" | "needs_review" = "normal"
      if (dup) {
        reviewStatus = "needs_review"
      } else if (aiValidation && !aiValidation.is_valid_meal) {
        // AI says photo is not a valid meal → needs review
        reviewStatus = "needs_review"
      } else if (aiValidation && aiValidation.flags.length > 0) {
        // AI raised flags → needs review
        reviewStatus = "needs_review"
      }

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
        aiValidation,
        reviewStatus,
      })

      logger.info("lunch entry created", {
        tenant_id: ctx.tenantId,
        employee_id: ctx.employeeId.toString(),
        entry_id: entry._id.toString(),
        review_status: reviewStatus,
        has_photo: true,
        ai_is_valid_meal: aiValidation?.is_valid_meal,
        ai_category: aiValidation?.detected_category,
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
          ai_is_valid_meal: aiValidation?.is_valid_meal,
          ai_category: aiValidation?.detected_category,
          ai_reason: aiValidation?.reason,
        },
      })

      redirect(`/worker/entry?success=1&review=${reviewStatus}`)
    } catch (e) {
      // Re-throw redirect errors from Next.js
      if (typeof e === "object" && e !== null && "digest" in e) throw e

      logger.warn("photo upload failed; accepting entry without photo", {
        tenant_id: ctx.tenantId,
        employee_id: ctx.employeeId.toString(),
        err: e,
      })
      // fall through to no-photo submission
    }
  }

  // No photo submission: always mark as needs_review
  const reviewStatus = "needs_review"
  const entry = await createLunchEntry({
    tenantId: ctx.tenantId,
    employeeId: ctx.employeeId,
    deviceId: ctx.deviceId,
    entryDate: parsed.entryDate,
    siteName: parsed.siteName,
    totalAmount: parsed.totalAmount,
    note: parsed.note,
    aiValidation,
    reviewStatus,
  })

  logger.info("lunch entry created (no photo)", {
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
