import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"

import { env } from "@/env"
import { clientPromise } from "@/lib/mongodb"

/**
 * NextAuth configuration for Admin UI.
 *
 * MVP note:
 * - Provider: dev-only Credentials (email + password) for bootstrap.
 * - Later: replace with Google/Email provider and proper user/role management.
 */
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Dev Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Only allow in development or when explicitly configured.
        if (process.env.NODE_ENV !== "development") return null

        const adminEmail = env.DEV_ADMIN_EMAIL
        const adminPassword = env.DEV_ADMIN_PASSWORD
        if (!adminEmail || !adminPassword) return null

        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password ?? ""

        if (email !== adminEmail.toLowerCase()) return null
        if (password !== adminPassword) return null

        return {
          id: `dev-admin:${email}`,
          email,
          name: "Dev Admin",
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Minimal multi-tenant bootstrap: default tenant id is injected to session.
      session.tenantId = env.DEFAULT_TENANT_ID
      session.role = "admin"
      session.user.id = token.sub ?? session.user.id
      return session
    },
  },
}


