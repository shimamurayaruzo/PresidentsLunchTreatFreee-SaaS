import type { OptionalUnlessRequiredId, ObjectId } from "mongodb"

import { COLLECTIONS } from "@/lib/collections"
import { getDb } from "@/lib/db"

export type AuditEventName =
  | "PAIRING_TOKEN_ISSUED"
  | "PAIRING_COMPLETED"
  | "LUNCH_ENTRY_CREATED"
  | "LUNCH_ENTRY_STATUS_CHANGED"
  | "MONTHLY_PREVIEW_CREATED"
  | "MONTHLY_EXPORT_EXECUTED"

export type AuditEventDoc = {
  _id: ObjectId
  tenant_id: string
  event: AuditEventName
  actor_type: "admin" | "worker" | "system"
  actor_id?: string
  request_id?: string
  at: Date
  meta?: Record<string, unknown>
}

export async function writeAuditEvent(input: Omit<AuditEventDoc, "_id" | "at"> & { at?: Date }) {
  const db = await getDb()
  const doc: Omit<AuditEventDoc, "_id"> = {
    ...input,
    at: input.at ?? new Date(),
  }
  await db.collection<AuditEventDoc>(COLLECTIONS.auditEvents).insertOne(doc as OptionalUnlessRequiredId<AuditEventDoc>)
}


