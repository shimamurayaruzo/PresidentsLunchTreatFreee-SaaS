import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-3 py-2 text-sm hover:bg-muted/40">
      {children}
    </Link>
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/api/auth/signin")
  if (session.role !== "admin") redirect("/")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold">
              社長ランチごちします
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/admin/entries">申請一覧</NavLink>
              <NavLink href="/admin/pairing">QR発行</NavLink>
              <NavLink href="/admin/monthly">月次集計</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{session.user.email}</span>
            <Link href="/api/auth/signout" className="rounded-md border px-3 py-1.5 text-sm">
              ログアウト
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  )
}


