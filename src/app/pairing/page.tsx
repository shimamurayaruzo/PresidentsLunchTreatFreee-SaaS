import Link from "next/link"

import { completePairing } from "@/app/pairing/actions"

export default async function PairingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const token = typeof sp.token === "string" ? sp.token : ""
  const error = typeof sp.error === "string" ? sp.error : ""
  const success = typeof sp.success === "string" ? sp.success : ""

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">端末ペアリング</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        管理者が発行したQR（URL）からアクセスしてください。ペアリングすると次回から自動で申請できます。
      </p>

      {success ? (
        <div className="mt-6 rounded-md border p-4">
          <p className="font-medium">ペアリング完了</p>
          <p className="mt-1 text-sm text-muted-foreground">次回から自動で申請できます。</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">ペアリングできませんでした</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error === "invalid" ? "無効なQRコードです（期限切れ/使用済みの可能性）" : "このQRは使用できません"}
          </p>
        </div>
      ) : null}

      {!success ? (
        <form action={completePairing} className="mt-6 rounded-md border p-4">
          <label className="text-sm font-medium">トークン</label>
          <input
            name="token"
            defaultValue={token}
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="token"
            required
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            この端末を登録する
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            うまくいかない場合は、管理者にQRの再発行を依頼してください。
          </p>
        </form>
      ) : null}

      <div className="mt-6 text-sm">
        <Link href="/" className="underline underline-offset-4">
          トップへ
        </Link>
      </div>
    </div>
  )
}


