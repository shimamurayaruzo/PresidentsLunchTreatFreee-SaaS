import { cookies } from "next/headers"

import { hashDeviceSecret } from "@/lib/pairing/device-secret"
import { findEmployeeByDeviceSecretHash } from "@/lib/entries/repo"

export async function requireWorkerContext() {
  const secret = cookies().get("device_secret")?.value
  if (!secret) return null

  const secretHash = hashDeviceSecret(secret)
  const ctx = await findEmployeeByDeviceSecretHash({ secretHash })
  return ctx
}


