import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminSession } from "@/lib/auth-server"
import { createEmployee, listEmployees } from "@/lib/pairing/repo"

export const runtime = "nodejs"

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
})

export async function GET() {
  const session = await requireAdminSession()
  const employees = await listEmployees({ tenantId: session.tenantId })
  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e._id.toString(),
      email: e.email,
      name: e.name,
      status: e.status,
      createdAt: e.created_at.toISOString(),
    })),
  })
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  const body = await req.json()
  const input = createSchema.parse(body)

  const employee = await createEmployee({
    tenantId: session.tenantId,
    email: input.email,
    name: input.name,
  })

  return NextResponse.json({
    employee: {
      id: employee._id.toString(),
      email: employee.email,
      name: employee.name,
      status: employee.status,
    },
  })
}


