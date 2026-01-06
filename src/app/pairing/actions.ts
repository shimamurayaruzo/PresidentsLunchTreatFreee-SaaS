"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { ObjectId } from "mongodb"
import { z } from "zod"

import { generateDeviceSecret, hashDeviceSecret } from "@/lib/pairing/device-secret"
import { createDevice, findEmployeeById, findValidPairingToken, markPairingTokenUsed, revokeExistingDevices } from "@/lib/pairing/repo"

const schema = z.object({
  token: z.string().uuid(),
})

export async function completePairing(formData: FormData) {
  const token = String(formData.get("token") ?? "")
  const input = schema.parse({ token })

  const tokenDoc = await findValidPairingToken(input.token)
  if (!tokenDoc) {
    redirect("/pairing?error=invalid")
  }

  const employeeId = tokenDoc.employee_id
  const employee = await findEmployeeById({ tenantId: tokenDoc.tenant_id, employeeId: employeeId.toString() })
  if (!employee || employee.status !== "active") {
    redirect("/pairing?error=employee")
  }

  // Ensure "1 device per employee" behavior by revoking previous active devices.
  await revokeExistingDevices({ tenantId: tokenDoc.tenant_id, employeeId })

  const secret = generateDeviceSecret()
  const secretHash = hashDeviceSecret(secret)

  const ua = headers().get("user-agent") ?? undefined
  await createDevice({
    tenantId: tokenDoc.tenant_id,
    employeeId: new ObjectId(employeeId.toString()),
    deviceSecretHash: secretHash,
    userAgent: ua,
  })

  await markPairingTokenUsed({ tokenId: tokenDoc._id })

  cookies().set({
    name: "device_secret",
    value: secret,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  redirect("/pairing?success=1")
}


