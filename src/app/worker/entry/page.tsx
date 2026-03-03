import Link from "next/link"
import { redirect } from "next/navigation"

import { submitLunchEntry } from "@/app/worker/entry/actions"
import { WorkerEntryForm } from "@/app/worker/entry/WorkerEntryForm"
import { requireWorkerContext } from "@/lib/worker-auth"

function todayJst(): string {
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
      <p className="mt-1 text-xs text-muted-foreground">
        写真を撮ると、AIが食事の写真かどうかを自動判定します
      </p>

      {success ? (
        <div className="mt-4 rounded-md border p-4">
          <p className="font-medium">申請を受け付けました</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {review === "needs_review"
              ? "写真の内容にAIが注意フラグを付けたため「要確認」になりました。経理が確認します。"
              : "AIが食事の写真と判定しました。最終判断は経理が行います。"}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">エラー</p>
          <p className="mt-1 text-sm text-muted-foreground">申請を送信できませんでした。入力内容を確認してください。</p>
        </div>
      ) : null}

      <WorkerEntryForm defaultDate={todayJst()} submitAction={submitLunchEntry} />

      <div className="mt-6 text-sm">
        <Link href="/worker" className="underline underline-offset-4">
          戻る
        </Link>
      </div>
    </div>
  )
}
