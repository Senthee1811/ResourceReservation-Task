export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading...
        </span>
      </div>
    </div>
  );
}
