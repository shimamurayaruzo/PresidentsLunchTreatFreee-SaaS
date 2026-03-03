import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import type { AppRole } from "@/types/next-auth"

/**
 * For Server Components / Server Actions:
 * Redirects to sign-in if not authenticated.
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/api/auth/signin")
  if (session.role !== "admin") redirect("/")
  return session
}

/**
 * For Server Components / Server Actions:
 * Redirects if not authenticated with one of the allowed roles.
 */
export async function requireRoleSession(roles: AppRole[]) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/api/auth/signin")
  if (!roles.includes(session.role)) redirect("/")
  return session
}

/**
 * For API Route Handlers (route.ts):
 * Throws HTTP-friendly errors instead of redirecting.
 */
export async function requireAdminSessionForApi() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("UNAUTHORIZED")
  if (session.role !== "admin") throw new Error("FORBIDDEN")
  return session
}
