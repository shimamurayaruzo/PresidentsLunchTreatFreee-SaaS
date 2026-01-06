import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { executeMonthlyExport, previewMonthlyExport } from "@/app/admin/monthly/actions"
import { authOptions } from "@/lib/auth"
import { findExportByBatchId, exportBatchId } from "@/lib/monthly/repo"

function thisMonth(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${yyyy}-${mm}`
}

export default async function AdminMonthlyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/api/auth/signin")
  if (session.role !== "admin") redirect("/")

  const sp = await searchParams
  const yearMonth = typeof sp.yearMonth === "string" ? sp.yearMonth : thisMonth()
  const executed = typeof sp.executed === "string" ? sp.executed : ""
  const error = typeof sp.error === "string" ? sp.error : ""

  const batchId = exportBatchId(session.tenantId, yearMonth)
  const exportDoc = await findExportByBatchId({ exportBatchId: batchId })

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">月次集計（手動）</h1>
      <p className="mt-2 text-sm text-muted-foreground">対象月を選択して、集計プレビュー→手動実行します。</p>

      {executed ? (
        <div className="mt-4 rounded-md border p-4">
          <p className="font-medium">実行しました</p>
          <p className="mt-1 text-sm text-muted-foreground">freeeへ下書きを作成しました（設定次第でURLが表示されます）。</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">実行できませんでした</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error === "no_preview"
              ? "先にプレビューを作成してください。"
              : "freee送信に失敗しました。環境変数（FREEE_ACCESS_TOKEN / FREEE_COMPANY_ID など）を確認してください。"}
          </p>
        </div>
      ) : null}

      <div className="mt-6 rounded-md border p-4">
        <form action={previewMonthlyExport} className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">対象月</label>
            <input
              type="month"
              name="yearMonth"
              defaultValue={yearMonth}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">プレビュー</button>
        </form>
      </div>

      {exportDoc ? (
        <div className="mt-6 rounded-md border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">プレビュー結果</p>
              <p className="mt-1 text-sm text-muted-foreground">
                status: <span className="font-mono">{exportDoc.status}</span> / batch:{" "}
                <span className="font-mono">{exportDoc.export_batch_id}</span>
              </p>
            </div>

            <form action={executeMonthlyExport}>
              <input type="hidden" name="yearMonth" value={yearMonth} />
              <button
                className="rounded-md border px-4 py-2 text-sm font-medium"
                disabled={exportDoc.status === "executed"}
              >
                {exportDoc.status === "executed" ? "実行済み" : "手動実行"}
              </button>
            </form>
          </div>

          {exportDoc.freee_draft_url ? (
            <div className="mt-3 text-sm">
              <a href={exportDoc.freee_draft_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                freee下書きを開く
              </a>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>件数</span>
              <span className="font-mono">{exportDoc.payload.total_entries}</span>
            </div>
            <div className="flex justify-between">
              <span>補助合計</span>
              <span className="font-mono">{exportDoc.payload.total_subsidy_yen} 円</span>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b">
                <tr>
                  <th className="py-2 pr-3">employee</th>
                  <th className="py-2 pr-3">entries</th>
                  <th className="py-2 pr-3">subsidy</th>
                  <th className="py-2">needs_review</th>
                </tr>
              </thead>
              <tbody>
                {exportDoc.payload.by_employee.map((r) => (
                  <tr key={r.employee_id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-mono text-xs">{r.employee_id}</td>
                    <td className="py-2 pr-3 font-mono">{r.entries}</td>
                    <td className="py-2 pr-3 font-mono">{r.subsidy_yen}</td>
                    <td className="py-2 font-mono">{r.needs_review_entries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mt-6 text-sm">
        <Link href="/admin/pairing" className="underline underline-offset-4">
          QR発行へ
        </Link>
      </div>
    </div>
  )
}


