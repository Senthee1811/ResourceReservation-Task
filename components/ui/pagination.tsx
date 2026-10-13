import Link from "next/link";
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

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
      className={cn(
        "flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-2 py-4 sm:flex-row dark:border-slate-800",
        className,
      )}
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
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1 opacity-50 cursor-not-allowed hover:bg-transparent",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </span>
        )}

        <span className="px-2 text-sm text-slate-600 dark:text-slate-400">
          Page {currentPage} of {totalPages}
        </span>

        {hasNext ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1 opacity-50 cursor-not-allowed hover:bg-transparent",
            )}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
