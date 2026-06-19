import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-cloud/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-sm font-semibold text-white">
              AI
            </span>
            <span className="text-base font-semibold tracking-normal">AI 员工</span>
          </Link>
          <Link
            href="/admin"
            className="rounded-lg bg-mint px-3 py-1 text-sm font-semibold text-jade transition hover:bg-white"
          >
            后台
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
