import Link from "next/link"

import { requireAdminSession } from "@/lib/auth-server"
import { countEntriesByMonth } from "@/lib/entries/repo"
import { exportBatchId, findExportByBatchId } from "@/lib/monthly/repo"

function thisMonth(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${yyyy}-${mm}`
}

function StatCard({
  title,
  value,
  hint,
  href,
}: {
  title: string
  value: string
  hint?: string
  href?: string
}) {
  const inner = (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
  return href ? (
    <Link href={href} className="block hover:bg-muted/20">
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession()
  const yearMonth = thisMonth()

  const [total, needsReview, exportDoc] = await Promise.all([
    countEntriesByMonth({ tenantId: session.tenantId, yearMonth }),
    countEntriesByMonth({ tenantId: session.tenantId, yearMonth, reviewStatus: "needs_review" }),
    findExportByBatchId({ exportBatchId: exportBatchId(session.tenantId, yearMonth) }),
  ])

  const exportStatus = exportDoc?.status ?? "none"
  const exportHint =
    exportStatus === "error"
      ? exportDoc?.error_message ?? "freee送信エラー"
      : exportStatus === "executed"
        ? "freee下書き作成済み"
        : exportStatus === "preview"
          ? "プレビュー作成済み（未実行）"
          : "未作成"

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">管理ダッシュボード</h1>
        <p className="mt-2 text-sm text-muted-foreground">今月（{yearMonth}）の状況</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="申請件数" value={`${total}`} hint="今月の申請（全て）" href="/admin/entries" />
        <StatCard
          title="要確認件数"
          value={`${needsReview}`}
          hint="重複疑いなど"
          href="/admin/entries?filter=needs_review"
        />
        <StatCard title="月次送信ステータス" value={exportStatus} hint={exportHint} href={`/admin/monthly?yearMonth=${yearMonth}`} />
      </div>

      <div className="rounded-lg border bg-muted/10 p-4 text-sm">
        <p className="font-medium">デモの最短導線</p>
        <ol className="mt-2 list-inside list-decimal text-muted-foreground">
          <li>
            <Link className="underline underline-offset-4" href="/admin/pairing">
              QR発行
            </Link>{" "}
            → 職人がペアリング
          </li>
          <li>
            職人が{" "}
            <Link className="underline underline-offset-4" href="/worker">
              申請
            </Link>
          </li>
          <li>
            管理が{" "}
            <Link className="underline underline-offset-4" href="/admin/entries">
              申請一覧
            </Link>{" "}
            で確認
          </li>
          <li>
            管理が{" "}
            <Link className="underline underline-offset-4" href={`/admin/monthly?yearMonth=${yearMonth}`}>
              月次集計→手動実行
            </Link>{" "}
            でfreee下書きを作成
          </li>
        </ol>
      </div>
    </div>
  )
}


