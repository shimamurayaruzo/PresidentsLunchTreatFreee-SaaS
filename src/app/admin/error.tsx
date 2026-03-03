"use client"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-md border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">エラーが発生しました</h2>
        <p className="mt-2 text-sm text-red-700">
          管理画面の読み込み中にエラーが発生しました。ページを再読み込みしてください。
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-red-500">Digest: {error.digest}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            onClick={reset}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            再読み込み
          </button>
          <a
            href="/api/auth/signin"
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            ログインし直す
          </a>
        </div>
      </div>
    </div>
  )
}
