import Link from "next/link"

import { requireAdminSession } from "@/lib/auth-server"
import { listEmployees } from "@/lib/pairing/repo"
import { listRecentEntries } from "@/lib/entries/repo"

export default async function AdminEntriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireAdminSession()

  const sp = await searchParams
  const filter = typeof sp.filter === "string" ? sp.filter : ""
  const reviewStatus = filter === "needs_review" ? "needs_review" : undefined

  const [entries, employees] = await Promise.all([
    listRecentEntries({ tenantId: session.tenantId, limit: 100, reviewStatus }),
    listEmployees({ tenantId: session.tenantId, limit: 500 }),
  ])

  const employeeMap = new Map(employees.map((e) => [e._id.toString(), e]))

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold">申請一覧</h1>
      <p className="mt-2 text-sm text-muted-foreground">最新100件を表示します。</p>

      <div className="mt-4 flex gap-2 text-sm">
        <Link
          href="/admin/entries"
          className={`rounded-md border px-3 py-1.5 ${!reviewStatus ? "bg-muted" : ""}`}
        >
          全て
        </Link>
        <Link
          href="/admin/entries?filter=needs_review"
          className={`rounded-md border px-3 py-1.5 ${reviewStatus ? "bg-muted" : ""}`}
        >
          要確認のみ
        </Link>
        <Link href="/admin/monthly" className="ml-auto underline underline-offset-4">
          月次集計へ
        </Link>
      </div>

      <div className="mt-6 overflow-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="p-3">利用日</th>
              <th className="p-3">現場名</th>
              <th className="p-3">申請者</th>
              <th className="p-3">金額</th>
              <th className="p-3">ステータス</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const emp = employeeMap.get(e.employee_id.toString())
              return (
                <tr key={e._id.toString()} className="border-b last:border-b-0">
                  <td className="p-3 font-mono text-xs">{e.entry_date}</td>
                  <td className="p-3">{e.site_name}</td>
                  <td className="p-3 text-xs">{emp?.email ?? e.employee_id.toString()}</td>
                  <td className="p-3 font-mono">{e.total_amount}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${e.review_status === "needs_review" ? "bg-yellow-100" : "bg-emerald-100"}`}>
                      {e.review_status}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/entries/${e._id.toString()}`} className="underline underline-offset-4">
                      詳細
                    </Link>
                  </td>
                </tr>
              )
            })}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  申請がありません
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}


