import Link from "next/link"
import { redirect } from "next/navigation"

import { requireWorkerContext } from "@/lib/worker-auth"

export default async function WorkerHomePage() {
  const ctx = await requireWorkerContext()
  if (!ctx) redirect("/pairing")

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">申請トップ</h1>
      <p className="mt-2 text-sm text-muted-foreground">今日のランチを申請します。</p>

      <div className="mt-6 grid gap-3">
        <Link
          href="/worker/entry"
          className="w-full rounded-md bg-foreground px-4 py-2 text-center text-sm font-medium text-background"
        >
          今日のランチを申請する
        </Link>
      </div>
    </div>
  )
}


