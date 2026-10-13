import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth-actions";
import { Badge } from "./ui/badge";

export async function NavBar() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href={isAdmin ? "/admin/resources" : "/resources"}
            className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
            <span className="hidden sm:inline font-semibold text-base">ResourceHub</span>
          </Link>

          <nav
            aria-label="Main Navigation"
            className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm font-medium"
          >
            {!isAdmin ? (
              <>
                <Link
                  href="/resources"
                  className="rounded-lg px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Resources
                </Link>
                <Link
                  href="/reservations"
                  className="rounded-lg px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  My reservations
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/admin/resources"
                  className="rounded-lg px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Admin: Resources
                </Link>
                <Link
                  href="/admin/reservations"
                  className="rounded-lg px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Admin: Reservations
                </Link>
                <Link
                  href="/admin/usage"
                  className="rounded-lg px-3 py-1.5 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Admin: Usage
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {user.name}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </span>
          </div>

          <Badge variant={isAdmin ? "roleAdmin" : "roleMember"}>
            {user.role}
          </Badge>

          <form action={logoutAction} className="inline">
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
