import crypto from "node:crypto"
import { ObjectId } from "mongodb"
import { NextResponse } from "next/server"
import { z } from "zod"

import { env } from "@/env"
import { requireAdminSession } from "@/lib/auth-server"
import { writeAuditEvent } from "@/lib/audit"
import { createPairingToken, findEmployeeById, invalidateUnUsedPairingTokens } from "@/lib/pairing/repo"

export const runtime = "nodejs"

const createSchema = z.object({
  employeeId: z.string().min(1),
  expiresInHours: z.number().int().min(1).max(72).optional(),
})

export async function POST(req: Request) {
  const session = await requireAdminSession()
  const body = await req.json()
  const input = createSchema.parse(body)

  const employee = await findEmployeeById({ tenantId: session.tenantId, employeeId: input.employeeId })
  if (!employee) {
    return NextResponse.json({ error: "EMPLOYEE_NOT_FOUND" }, { status: 404 })
  }

  const employeeId = new ObjectId(input.employeeId)

  // Re-issue rule: invalidate any previous unused tokens immediately.
  await invalidateUnUsedPairingTokens({ tenantId: session.tenantId, employeeId })

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + (input.expiresInHours ?? 24) * 60 * 60 * 1000)

  const created = await createPairingToken({
    tenantId: session.tenantId,
    employeeId,
    token,
    expiresAt,
    createdBy: session.user.email ?? session.user.id,
  })

  const origin = env.NEXTAUTH_URL ?? req.headers.get("origin") ?? ""
  const pairingUrl = `${origin.replace(/\/$/, "")}/pairing?token=${encodeURIComponent(token)}`

  await writeAuditEvent({
    tenant_id: session.tenantId,
    event: "PAIRING_TOKEN_ISSUED",
    actor_type: "admin",
    actor_id: session.user.email ?? session.user.id,
    meta: {
      employee_id: employeeId.toString(),
      expires_at: expiresAt.toISOString(),
    },
  })

  return NextResponse.json({
    token: {
      id: created._id.toString(),
      token: created.token,
      expiresAt: created.expires_at.toISOString(),
      employeeId: created.employee_id.toString(),
      pairingUrl,
    },
  })
}


