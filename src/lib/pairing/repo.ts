import type { OptionalUnlessRequiredId } from "mongodb"
import { ObjectId } from "mongodb"

import { COLLECTIONS } from "@/lib/collections"
import { getDb } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { DeviceDoc, DevicePairingTokenDoc, EmployeeDoc } from "@/lib/pairing/types"

export async function createEmployee(input: { tenantId: string; email: string; name?: string }) {
  const db = await getDb()
  const now = new Date()
  const email = input.email.trim().toLowerCase()

  const existing = await db.collection<EmployeeDoc>(COLLECTIONS.employees).findOne({
    tenant_id: input.tenantId,
    email,
  })
  if (existing) return existing

  const doc: Omit<EmployeeDoc, "_id"> = {
    tenant_id: input.tenantId,
    email,
    name: input.name?.trim() || undefined,
    status: "active",
    created_at: now,
    updated_at: now,
  }

  const res = await db.collection<EmployeeDoc>(COLLECTIONS.employees).insertOne(doc as EmployeeDoc)
  const created = { ...(doc as EmployeeDoc), _id: res.insertedId }
  logger.info("employee created", { tenant_id: input.tenantId, employee_id: created._id.toString(), email })
  return created
}

export async function listEmployees(input: { tenantId: string; limit?: number }) {
  const db = await getDb()
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)
  return await db
    .collection<EmployeeDoc>(COLLECTIONS.employees)
    .find({ tenant_id: input.tenantId }, { sort: { created_at: -1 }, limit })
    .toArray()
}

export async function findEmployeeById(input: { tenantId: string; employeeId: string }) {
  const db = await getDb()
  return await db.collection<EmployeeDoc>(COLLECTIONS.employees).findOne({
    tenant_id: input.tenantId,
    _id: new ObjectId(input.employeeId),
  })
}

export async function invalidateUnUsedPairingTokens(input: { tenantId: string; employeeId: ObjectId }) {
  const db = await getDb()
  const now = new Date()
  await db.collection<DevicePairingTokenDoc>(COLLECTIONS.devicePairingTokens).updateMany(
    {
      tenant_id: input.tenantId,
      employee_id: input.employeeId,
      used_at: null,
      expires_at: { $gt: now },
    },
    {
      $set: { expires_at: now },
    },
  )
}

export async function createPairingToken(input: {
  tenantId: string
  employeeId: ObjectId
  token: string
  expiresAt: Date
  createdBy: string
}) {
  const db = await getDb()
  const doc: Omit<DevicePairingTokenDoc, "_id"> = {
    tenant_id: input.tenantId,
    token: input.token,
    employee_id: input.employeeId,
    expires_at: input.expiresAt,
    used_at: null,
    created_by: input.createdBy,
    created_at: new Date(),
  }
  const res = await db
    .collection<DevicePairingTokenDoc>(COLLECTIONS.devicePairingTokens)
    .insertOne(doc as OptionalUnlessRequiredId<DevicePairingTokenDoc>)
  return { ...(doc as DevicePairingTokenDoc), _id: res.insertedId }
}

export async function findValidPairingToken(token: string) {
  const db = await getDb()
  const now = new Date()
  return await db.collection<DevicePairingTokenDoc>(COLLECTIONS.devicePairingTokens).findOne({
    token,
    used_at: null,
    expires_at: { $gt: now },
  })
}

export async function markPairingTokenUsed(input: { tokenId: ObjectId }) {
  const db = await getDb()
  await db
    .collection<DevicePairingTokenDoc>(COLLECTIONS.devicePairingTokens)
    .updateOne({ _id: input.tokenId }, { $set: { used_at: new Date() } })
}

export async function revokeExistingDevices(input: { tenantId: string; employeeId: ObjectId }) {
  const db = await getDb()
  await db.collection<DeviceDoc>(COLLECTIONS.devices).updateMany(
    { tenant_id: input.tenantId, employee_id: input.employeeId, revoked_at: null },
    { $set: { revoked_at: new Date() } },
  )
}

export async function createDevice(input: {
  tenantId: string
  employeeId: ObjectId
  deviceSecretHash: string
  userAgent?: string
}) {
  const db = await getDb()
  const doc: Omit<DeviceDoc, "_id"> = {
    tenant_id: input.tenantId,
    employee_id: input.employeeId,
    device_secret_hash: input.deviceSecretHash,
    paired_at: new Date(),
    revoked_at: null,
    user_agent: input.userAgent,
  }
  const res = await db
    .collection<DeviceDoc>(COLLECTIONS.devices)
    .insertOne(doc as OptionalUnlessRequiredId<DeviceDoc>)
  return { ...(doc as DeviceDoc), _id: res.insertedId }
}


