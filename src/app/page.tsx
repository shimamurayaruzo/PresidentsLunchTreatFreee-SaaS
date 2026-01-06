import Link from "next/link"

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">社長ランチごちします freee連携版（SaaS）</h1>
      <p className="mt-2 text-sm text-muted-foreground">ハッカソン最小デモ用ナビゲーション</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/api/auth/signin" className="rounded-md border p-4 hover:bg-muted/30">
          <p className="font-medium">管理ログイン</p>
          <p className="mt-1 text-sm text-muted-foreground">NextAuth（Credentials）</p>
        </Link>
        <Link href="/admin/pairing" className="rounded-md border p-4 hover:bg-muted/30">
          <p className="font-medium">QR発行（管理）</p>
          <p className="mt-1 text-sm text-muted-foreground">ペアリングURLを発行</p>
        </Link>
        <Link href="/pairing" className="rounded-md border p-4 hover:bg-muted/30">
          <p className="font-medium">ペアリング（職人）</p>
          <p className="mt-1 text-sm text-muted-foreground">/pairing?token=…</p>
        </Link>
        <Link href="/worker" className="rounded-md border p-4 hover:bg-muted/30">
          <p className="font-medium">職人：申請</p>
          <p className="mt-1 text-sm text-muted-foreground">日次入力（写真+現場+金額）</p>
        </Link>
        <Link href="/admin/entries" className="rounded-md border p-4 hover:bg-muted/30">
          <p className="font-medium">管理：申請一覧</p>
          <p className="mt-1 text-sm text-muted-foreground">要確認フィルタ/詳細</p>
        </Link>
        <Link href="/admin/monthly" className="rounded-md border p-4 hover:bg-muted/30">
          <p className="font-medium">管理：月次集計（手動）</p>
          <p className="mt-1 text-sm text-muted-foreground">プレビュー→実行ログ</p>
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        セットアップ: <span className="font-mono">docs/SETUP.md</span>
      </p>
    </div>
  )
}
