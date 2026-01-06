import type { OptionalUnlessRequiredId } from "mongodb"
import { ObjectId } from "mongodb"

import { COLLECTIONS } from "@/lib/collections"
import { getDb } from "@/lib/db"
import type { LunchEntryDoc, ReviewStatus } from "@/lib/entries/types"

export async function countEntriesByMonth(input: { tenantId: string; yearMonth: string; reviewStatus?: ReviewStatus }) {
  const db = await getDb()
  const query: Record<string, unknown> = { tenant_id: input.tenantId, year_month: input.yearMonth }
  if (input.reviewStatus) query.review_status = input.reviewStatus
  return await db.collection<LunchEntryDoc>(COLLECTIONS.lunchEntries).countDocuments(query)
}

export async function listRecentEntries(input: { tenantId: string; limit?: number; reviewStatus?: ReviewStatus }) {
  const db = await getDb()
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)
  const query: Record<string, unknown> = { tenant_id: input.tenantId }
  if (input.reviewStatus) query.review_status = input.reviewStatus
  return await db
    .collection<LunchEntryDoc>(COLLECTIONS.lunchEntries)
    .find(query, { sort: { created_at: -1 }, limit })
    .toArray()
}

export async function findEntryById(input: { tenantId: string; entryId: string }) {
  const db = await getDb()
  return await db.collection<LunchEntryDoc>(COLLECTIONS.lunchEntries).findOne({
    tenant_id: input.tenantId,
    _id: new ObjectId(input.entryId),
  })
}

export async function listEntriesByPhotoHash(input: { tenantId: string; photoHash: string; excludeId?: string }) {
  const db = await getDb()
  const query: Record<string, unknown> = {
    tenant_id: input.tenantId,
    photo_hash: input.photoHash,
  }
  if (input.excludeId) query._id = { $ne: new ObjectId(input.excludeId) }
  return await db.collection<LunchEntryDoc>(COLLECTIONS.lunchEntries).find(query, { sort: { created_at: -1 } }).toArray()
}

export async function updateEntryReviewStatus(input: { tenantId: string; entryId: string; reviewStatus: ReviewStatus }) {
  const db = await getDb()
  await db.collection<LunchEntryDoc>(COLLECTIONS.lunchEntries).updateOne(
    { tenant_id: input.tenantId, _id: new ObjectId(input.entryId) },
    { $set: { review_status: input.reviewStatus } },
  )
}

export async function listEntriesByMonth(input: { tenantId: string; yearMonth: string }) {
  const db = await getDb()
  return await db
    .collection<LunchEntryDoc>(COLLECTIONS.lunchEntries)
    .find({ tenant_id: input.tenantId, year_month: input.yearMonth }, { sort: { created_at: 1 } })
    .toArray()
}

export async function findDuplicateByPhotoHash(input: { tenantId: string; photoHash: string }) {
  const db = await getDb()
  return await db.collection<LunchEntryDoc>(COLLECTIONS.lunchEntries).findOne({
    tenant_id: input.tenantId,
    photo_hash: input.photoHash,
  })
}

export async function createLunchEntry(input: {
  tenantId: string
  employeeId: ObjectId
  deviceId: ObjectId
  entryDate: string
  siteName: string
  totalAmount: number
  note?: string
  photoHash?: string
  photoDriveFileId?: string
  photoUrl?: string
  photoMime?: string
  reviewStatus: ReviewStatus
}) {
  const db = await getDb()
  const doc: Omit<LunchEntryDoc, "_id"> = {
    tenant_id: input.tenantId,
    employee_id: input.employeeId,
    device_id: input.deviceId,
    entry_date: input.entryDate,
    year_month: input.entryDate.slice(0, 7),
    site_name: input.siteName,
    total_amount: input.totalAmount,
    note: input.note,
    photo_hash: input.photoHash,
    photo_drive_file_id: input.photoDriveFileId,
    photo_url: input.photoUrl,
    photo_mime: input.photoMime,
    review_status: input.reviewStatus,
    created_at: new Date(),
  }

  const res = await db
    .collection<LunchEntryDoc>(COLLECTIONS.lunchEntries)
    .insertOne(doc as OptionalUnlessRequiredId<LunchEntryDoc>)

  return { ...(doc as LunchEntryDoc), _id: res.insertedId }
}

export async function findEmployeeByDeviceSecretHash(input: { secretHash: string }) {
  const db = await getDb()
  // devices collection was defined in pairing types; re-fetch minimal fields here to avoid import cycles.
  const device = await db.collection(COLLECTIONS.devices).findOne({
    device_secret_hash: input.secretHash,
    revoked_at: null,
  })
  if (!device) return null
  return {
    deviceId: device._id as ObjectId,
    tenantId: device.tenant_id as string,
    employeeId: device.employee_id as ObjectId,
  }
}


