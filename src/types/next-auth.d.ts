import type { DefaultSession } from "next-auth"

export type AppRole = "admin" | "accountant" | "viewer"

declare module "next-auth" {
  interface Session extends DefaultSession {
    tenantId: string
    role: AppRole
    user: DefaultSession["user"] & {
      id: string
    }
  }
}


