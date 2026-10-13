import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In | Resource Reservation System",
  description: "Sign in to reserve shared resources across the organization",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md dark:bg-slate-100 dark:text-slate-900">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Resource Reservation System
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Sign in to coordinate and book organization resources
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LoginForm />

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Need an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-slate-900 underline hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300"
            >
              Sign up as a new member
            </Link>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Demo Credentials
            </h2>
            <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Admin:
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  admin@example.com / Admin@123
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Member:
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  member@example.com / Member@123
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
