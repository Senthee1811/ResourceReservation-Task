import React from "react";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: string; title: string; text: string }
> = {
  info: {
    container:
      "border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/40",
    icon: "text-sky-600 dark:text-sky-400",
    title: "text-sky-900 dark:text-sky-200",
    text: "text-sky-800 dark:text-sky-300",
  },
  success: {
    container:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40",
    icon: "text-emerald-600 dark:text-emerald-400",
    title: "text-emerald-900 dark:text-emerald-200",
    text: "text-emerald-800 dark:text-emerald-300",
  },
  warning: {
    container:
      "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-200",
    text: "text-amber-800 dark:text-amber-300",
  },
  error: {
    container:
      "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-200",
    text: "text-red-800 dark:text-red-300",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
  ...props
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`rounded-lg border p-4 text-sm ${styles.container} ${className}`}
      {...props}
    >
      <div className="flex gap-3">
        <div className={`mt-0.5 shrink-0 ${styles.icon}`}>
          {variant === "error" && (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          )}
          {variant === "warning" && (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          )}
          {variant === "success" && (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          {variant === "info" && (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
          )}
        </div>
        <div className="flex-1">
          {title && <h4 className={`font-semibold ${styles.title}`}>{title}</h4>}
          <div className={`${title ? "mt-1" : ""} ${styles.text}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
