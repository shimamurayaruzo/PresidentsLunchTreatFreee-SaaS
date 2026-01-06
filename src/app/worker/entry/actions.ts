"use server"

import crypto from "node:crypto"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createLunchEntry, findDuplicateByPhotoHash } from "@/lib/entries/repo"
import { uploadLunchPhotoToDrive } from "@/lib/drive"
import { logger } from "@/lib/logger"
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

  if (!(photo instanceof File)) {
    redirect("/worker/entry?error=photo")
  }
  if (!photo.type.startsWith("image/")) {
    redirect("/worker/entry?error=photo")
  }

  const bytes = Buffer.from(await photo.arrayBuffer())
  const photoHash = crypto.createHash("sha256").update(bytes).digest("hex")

  const dup = await findDuplicateByPhotoHash({ tenantId: ctx.tenantId, photoHash })
  const reviewStatus = dup ? "needs_review" : "normal"

  const filenameSafeDate = parsed.entryDate.replaceAll("-", "")
  const filename = `lunch_${filenameSafeDate}_${ctx.employeeId.toString()}_${crypto.randomUUID()}.jpg`

  const uploaded = await uploadLunchPhotoToDrive({
    filename,
    mimeType: photo.type,
    bytes,
  })

  const entry = await createLunchEntry({
    tenantId: ctx.tenantId,
    employeeId: ctx.employeeId,
    deviceId: ctx.deviceId,
    entryDate: parsed.entryDate,
    siteName: parsed.siteName,
    totalAmount: parsed.totalAmount,
    note: parsed.note,
    photoHash,
    photoDriveFileId: uploaded.fileId,
    photoUrl: uploaded.webViewLink,
    photoMime: photo.type,
    reviewStatus,
  })

  logger.info("lunch entry created", {
    tenant_id: ctx.tenantId,
    employee_id: ctx.employeeId.toString(),
    entry_id: entry._id.toString(),
    review_status: reviewStatus,
  })

  redirect(`/worker/entry?success=1&review=${reviewStatus}`)
}


