import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { requireWorkerContext } from "@/lib/worker-auth"

export default async function Home() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.role === "admin"

  if (isAdmin) {
    redirect("/admin")
  }

  const workerCtx = await requireWorkerContext()
  const isWorker = !!workerCtx

  if (isWorker) {
    redirect("/worker")
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">社長ランチごちします</h1>
      <p className="mt-1 text-sm text-muted-foreground">AI写真判定 + freee連携 福利厚生費管理SaaS</p>

      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">AI写真判定機能</p>
        <p className="mt-1 text-xs text-blue-700">
          写真を撮ると、AIが「食事の写真かどうか」を自動判定し、経理向けに判定理由をコメントで生成します。
          食事と無関係な写真は自動的に「要確認」フラグが付き、経理はフラグ付きの申請だけを重点チェックできます。
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/api/auth/signin" className="rounded-md border p-4 hover:bg-muted/30">
          <p className="font-medium">管理ログイン</p>
          <p className="mt-1 text-sm text-muted-foreground">管理者はこちら</p>
        </Link>
        <Link href="/pairing" className="rounded-md border p-4 hover:bg-muted/30">
          <p className="font-medium">ペアリング（職人）</p>
          <p className="mt-1 text-sm text-muted-foreground">QRコードで端末登録</p>
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        セットアップ: <span className="font-mono">docs/SETUP.md</span> | GAIS AI DEVCON 2026 応募作品
      </p>
    </div>
  )
}
