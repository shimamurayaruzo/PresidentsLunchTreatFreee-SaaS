"use client"

import { useMemo, useState } from "react"

type Employee = { id: string; email: string; name?: string }

export function AdminPairingClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [selectedId, setSelectedId] = useState<string>(initialEmployees[0]?.id ?? "")
  const [pairingUrl, setPairingUrl] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const canCreate = useMemo(() => email.trim().length > 3, [email])

  async function refreshEmployees() {
    const res = await fetch("/api/admin/employees")
    if (!res.ok) throw new Error("failed to load employees")
    const data = (await res.json()) as { employees: Employee[] }
    setEmployees(data.employees)
    if (!selectedId && data.employees[0]?.id) setSelectedId(data.employees[0].id)
  }

  async function onCreateEmployee() {
    if (!canCreate) return
    setBusy(true)
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      })
      if (!res.ok) throw new Error("failed to create employee")
      setEmail("")
      setName("")
      await refreshEmployees()
    } finally {
      setBusy(false)
    }
  }

  async function onIssueToken() {
    if (!selectedId) return
    setBusy(true)
    try {
      const res = await fetch("/api/admin/pairing-tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeId: selectedId, expiresInHours: 24 }),
      })
      const data = (await res.json()) as { token?: { pairingUrl: string }; error?: string }
      if (!res.ok || !data.token) throw new Error(data.error || "failed to issue token")
      setPairingUrl(data.token.pairingUrl)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-md border p-4">
        <h2 className="font-medium">従業員を追加</h2>
        <div className="mt-3 grid gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name (任意)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={busy || !canCreate}
            onClick={onCreateEmployee}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="font-medium">ペアリングQR（URL）発行</h2>
        <p className="mt-1 text-sm text-muted-foreground">再発行すると旧トークンは即失効します。</p>

        <div className="mt-3 grid gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>
              従業員を選択
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.email}
                {e.name ? ` (${e.name})` : ""}
              </option>
            ))}
          </select>

          <button
            disabled={busy || !selectedId}
            onClick={onIssueToken}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            発行
          </button>

          {pairingUrl ? (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">ペアリングURL</p>
              <input
                readOnly
                value={pairingUrl}
                className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-xs"
              />
              <button
                onClick={() => navigator.clipboard.writeText(pairingUrl)}
                className="mt-2 rounded-md border px-3 py-1.5 text-xs"
              >
                コピー
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}


