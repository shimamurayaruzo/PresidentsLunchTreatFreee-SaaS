import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { AdminPairingClient } from "@/app/admin/pairing/AdminPairingClient"
import { authOptions } from "@/lib/auth"
import { listEmployees } from "@/lib/pairing/repo"

export default async function AdminPairingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/api/auth/signin")
  if (session.role !== "admin") redirect("/")

  const employees = await listEmployees({ tenantId: session.tenantId })

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">QR発行（端末ペアリング）</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        職人向けのペアリングURLを発行します（ハッカソン版はURL共有で運用）。再発行すると旧トークンは即失効します。
      </p>
      <AdminPairingClient
        initialEmployees={employees.map((e) => ({ id: e._id.toString(), email: e.email, name: e.name }))}
      />
    </div>
  )
}


