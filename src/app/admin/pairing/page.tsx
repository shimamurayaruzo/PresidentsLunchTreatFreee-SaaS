import { AdminPairingClient } from "@/app/admin/pairing/AdminPairingClient"
import { requireAdminSession } from "@/lib/auth-server"
import { listEmployees } from "@/lib/pairing/repo"

export default async function AdminPairingPage() {
  const session = await requireAdminSession()
  const employees = await listEmployees({ tenantId: session.tenantId })

  return (
    <div className="max-w-2xl">
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


