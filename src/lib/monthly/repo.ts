import type { OptionalUnlessRequiredId } from "mongodb"

import { COLLECTIONS } from "@/lib/collections"
import { getDb } from "@/lib/db"
import type { FreeeExportDoc } from "@/lib/monthly/types"

export function exportBatchId(tenantId: string, yearMonth: string) {
  return `${tenantId}:${yearMonth}`
}

export async function findExportByBatchId(input: { exportBatchId: string }) {
  const db = await getDb()
  return await db.collection<FreeeExportDoc>(COLLECTIONS.freeeExports).findOne({
    export_batch_id: input.exportBatchId,
  })
}

export async function upsertPreviewExport(input: Omit<FreeeExportDoc, "_id" | "created_at" | "status"> & { createdAt?: Date }) {
  const db = await getDb()
  const createdAt = input.createdAt ?? new Date()
  const doc: Omit<FreeeExportDoc, "_id"> = {
    ...input,
    created_at: createdAt,
    status: "preview",
  }

  await db.collection<FreeeExportDoc>(COLLECTIONS.freeeExports).updateOne(
    { export_batch_id: doc.export_batch_id },
    {
      $setOnInsert: doc as OptionalUnlessRequiredId<FreeeExportDoc>,
      $set: {
        payload: doc.payload,
        status: "preview",
      },
    },
    { upsert: true },
  )

  return await findExportByBatchId({ exportBatchId: doc.export_batch_id })
}

export async function markExportExecuted(input: { exportBatchId: string; freeeObjectId?: string; freeeDraftUrl?: string }) {
  const db = await getDb()
  await db.collection<FreeeExportDoc>(COLLECTIONS.freeeExports).updateOne(
    { export_batch_id: input.exportBatchId },
    {
      $set: {
        status: "executed",
        executed_at: new Date(),
        ...(input.freeeObjectId ? { freee_object_id: input.freeeObjectId } : {}),
        ...(input.freeeDraftUrl ? { freee_draft_url: input.freeeDraftUrl } : {}),
      },
    },
  )
}

export async function markExportError(input: { exportBatchId: string; message: string }) {
  const db = await getDb()
  await db.collection<FreeeExportDoc>(COLLECTIONS.freeeExports).updateOne(
    { export_batch_id: input.exportBatchId },
    {
      $set: {
        status: "error",
        error_message: input.message,
      },
    },
  )
}


