import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
        404 error
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
        The resource or page you requested could not be found or has been moved.
      </p>
      <div className="mt-6">
        <Link href="/resources">
          <Button variant="primary">Back to resources</Button>
        </Link>
      </div>
    </div>
  );
}
