"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isAdminLogin = pathname === "/admin/login";

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#f3f6f4]">
        <header className="border-b border-black/10 bg-ink text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-semibold text-ink">
                AI
              </span>
              <span className="text-base font-semibold">AI 员工后台</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-ink"
              >
                查看前台
              </Link>
              {!isAdminLogin ? (
                <a
                  href="/api/admin/logout"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mint"
                >
                  退出登录
                </a>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-cloud/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-sm font-semibold text-white">
              AI
            </span>
            <span className="text-base font-semibold tracking-normal">AI 员工</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
