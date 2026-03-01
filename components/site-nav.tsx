import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function SiteNav() {
  const session = await auth0.getSession();
  const user = session ? await getCurrentUser() : null;
  const unreadCount = user
    ? await prisma.notification.count({
        where: {
          userId: user.id,
          readAt: null,
        },
      })
    : 0;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="font-semibold text-slate-900">
          Office Hours OS
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/calendar" className="text-slate-700 hover:text-slate-900">
            Calendar
          </Link>
          <Link href="/live" className="text-slate-700 hover:text-slate-900">
            Live Now
          </Link>
          <Link href="/professors" className="text-slate-700 hover:text-slate-900">
            Professors
          </Link>
          <Link href="/tags" className="text-slate-700 hover:text-slate-900">
            Tags
          </Link>
          <Link
            href="/notifications"
            className="relative text-slate-700 hover:text-slate-900"
          >
            Notifications
            {unreadCount > 0 ? (
              <span className="absolute -right-4 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <Link href="/profile" className="text-slate-700 hover:text-slate-900">
            Profile
          </Link>
          {!session ? (
            <a
              href="/auth/login"
              className="rounded bg-slate-900 px-3 py-1.5 text-white"
            >
              Login
            </a>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-600">
                {user?.name ?? user?.email} ({user?.role ?? "STUDENT"})
              </span>
              <a
                href="/auth/logout"
                className="rounded border border-slate-300 px-3 py-1.5 text-slate-800"
              >
                Logout
              </a>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
