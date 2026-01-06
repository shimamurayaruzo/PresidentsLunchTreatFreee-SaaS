import type { ObjectId } from "mongodb"

export type EmployeeStatus = "active" | "inactive"

export type EmployeeDoc = {
  _id: ObjectId
  tenant_id: string
  email: string
  name?: string
  status: EmployeeStatus
  created_at: Date
  updated_at: Date
}

export type DevicePairingTokenDoc = {
  _id: ObjectId
  tenant_id: string
  token: string
  employee_id: ObjectId
  expires_at: Date
  used_at: Date | null
  created_by: string
  created_at: Date
}

export type DeviceDoc = {
  _id: ObjectId
  tenant_id: string
  employee_id: ObjectId
  device_secret_hash: string
  paired_at: Date
  revoked_at: Date | null
  user_agent?: string
}


