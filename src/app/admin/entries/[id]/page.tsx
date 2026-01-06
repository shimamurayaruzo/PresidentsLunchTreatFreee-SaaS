import Link from "next/link"
import { redirect } from "next/navigation"

import { setReviewStatus } from "@/app/admin/entries/[id]/actions"
import { requireAdminSession } from "@/lib/auth-server"
import { listEmployees } from "@/lib/pairing/repo"
import { findEntryById, listEntriesByPhotoHash } from "@/lib/entries/repo"

export default async function AdminEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAdminSession()

  const { id } = await params
  const entry = await findEntryById({ tenantId: session.tenantId, entryId: id })
  if (!entry) redirect("/admin/entries")

  const employees = await listEmployees({ tenantId: session.tenantId, limit: 500 })
  const dupes = entry.photo_hash
    ? await listEntriesByPhotoHash({ tenantId: session.tenantId, photoHash: entry.photo_hash, excludeId: id })
    : []
  const emp = employees.find((e) => e._id.toString() === entry.employee_id.toString())

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">申請詳細</h1>
        <Link href="/admin/entries" className="underline underline-offset-4">
          一覧へ
        </Link>
      </div>

      <div className="mt-6 rounded-md border p-4 text-sm">
        <div className="grid gap-2">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">利用日</span>
            <span className="font-mono">{entry.entry_date}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">現場名</span>
            <span>{entry.site_name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">申請者</span>
            <span className="text-xs">{emp?.email ?? entry.employee_id.toString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">金額</span>
            <span className="font-mono">{entry.total_amount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">ステータス</span>
            <span className="font-mono">{entry.review_status}</span>
          </div>
          {entry.note ? (
            <div className="grid gap-1">
              <span className="text-muted-foreground">備考</span>
              <span className="whitespace-pre-wrap">{entry.note}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-md border p-4">
        <p className="text-sm font-medium">写真</p>
        <p className="mt-1 text-xs text-muted-foreground">Google Driveリンク（webViewLink）</p>
        {entry.photo_url ? (
          <a
            href={entry.photo_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block underline underline-offset-4"
          >
            写真を開く
          </a>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">写真なし（ハッカソン緊急モード）</p>
        )}
      </div>

      <div className="mt-6 rounded-md border p-4">
        <p className="text-sm font-medium">操作</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={setReviewStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="reviewStatus" value="normal" />
            <button className="rounded-md border px-3 py-1.5 text-sm">承認（normal）</button>
          </form>
          <form action={setReviewStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="reviewStatus" value="needs_review" />
            <button className="rounded-md border px-3 py-1.5 text-sm">要確認にする</button>
          </form>
        </div>
      </div>

      <div className="mt-6 rounded-md border p-4">
        <p className="text-sm font-medium">重複検知</p>
        <p className="mt-1 text-xs text-muted-foreground">photo_hash が同一の他申請</p>
        {!entry.photo_hash ? (
          <p className="mt-2 text-sm text-muted-foreground">写真がないため判定できません</p>
        ) : null}
        {dupes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">なし</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm">
            {dupes.map((d) => (
              <li key={d._id.toString()}>
                <Link href={`/admin/entries/${d._id.toString()}`} className="underline underline-offset-4">
                  {d.entry_date} / {d.site_name} / {d.review_status}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


