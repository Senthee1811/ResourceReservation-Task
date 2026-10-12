import Link from "next/link";
import React from "react";

export interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  createPageUrl: (page: number) => string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalCount,
  pageSize,
  createPageUrl,
  className = "",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-2 py-4 sm:flex-row dark:border-slate-800 ${className}`}
    >
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Showing{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {totalCount === 0 ? 0 : startRecord}
        </span>{" "}
        to{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {endRecord}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {totalCount}
        </span>{" "}
        results
      </div>

      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Previous
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Previous
          </span>
        )}

        <span className="px-2 text-sm text-slate-600 dark:text-slate-400">
          Page {currentPage} of {totalPages}
        </span>

        {hasNext ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Next
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600">
            Next
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </span>
        )}
      </div>
    </nav>
  );
}
