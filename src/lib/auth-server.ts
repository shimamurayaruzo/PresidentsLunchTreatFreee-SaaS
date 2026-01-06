import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import type { AppRole } from "@/types/next-auth"

export async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("UNAUTHORIZED")
  if (session.role !== "admin") throw new Error("FORBIDDEN")
  return session
}

export async function requireRoleSession(roles: AppRole[]) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("UNAUTHORIZED")
  if (!roles.includes(session.role)) throw new Error("FORBIDDEN")
  return session
}


