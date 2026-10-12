import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center ${className}`}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {(action || children) && (
        <div className="flex shrink-0 items-center gap-3">
          {action}
          {children}
        </div>
      )}
    </div>
  );
}
