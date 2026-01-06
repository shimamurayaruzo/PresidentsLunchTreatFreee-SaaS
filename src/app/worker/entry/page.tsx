import Link from "next/link"
import { redirect } from "next/navigation"

import { submitLunchEntry } from "@/app/worker/entry/actions"
import { requireWorkerContext } from "@/lib/worker-auth"

function todayJst(): string {
  // Minimal: rely on server timezone; refine later if needed.
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default async function WorkerEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ctx = await requireWorkerContext()
  if (!ctx) redirect("/pairing")

  const sp = await searchParams
  const success = typeof sp.success === "string" ? sp.success : ""
  const review = typeof sp.review === "string" ? sp.review : ""
  const error = typeof sp.error === "string" ? sp.error : ""

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">申請入力</h1>

      {success ? (
        <div className="mt-4 rounded-md border p-4">
          <p className="font-medium">申請を受け付けました</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {review === "needs_review"
              ? "重複の可能性があるため「要確認」になりました。"
              : "最終判断は経理が行います。"}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">エラー</p>
          <p className="mt-1 text-sm text-muted-foreground">申請を送信できませんでした。入力内容を確認してください。</p>
        </div>
      ) : null}

      <form action={submitLunchEntry} className="mt-6 grid gap-4 rounded-md border p-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">利用日</label>
          <input
            type="date"
            name="entryDate"
            defaultValue={todayJst()}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">現場名</label>
          <input
            name="siteName"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="例）新宿ビル現場"
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">弁当代（実費）</label>
          <input
            name="totalAmount"
            inputMode="numeric"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="例）600"
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">写真（弁当 / 任意）</label>
          <p className="text-xs text-muted-foreground">ハッカソン版：写真は任意です（後で経理が確認）。</p>
          <input type="file" name="photo" accept="image/*" className="w-full text-sm" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">備考（任意）</label>
          <textarea
            name="note"
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="任意"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          申請する
        </button>
      </form>

      <div className="mt-6 text-sm">
        <Link href="/worker" className="underline underline-offset-4">
          戻る
        </Link>
      </div>
    </div>
  )
}


