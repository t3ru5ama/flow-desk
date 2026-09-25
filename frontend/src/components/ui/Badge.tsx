import type { ReactNode } from "react";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-fd-khaki/50 text-fd-cacao",
  success: "bg-fd-success/10 text-fd-success",
  warning: "bg-fd-warning/10 text-fd-warning",
  error: "bg-fd-error/10 text-fd-error",
  info: "bg-fd-info/10 text-fd-info",
};

export function Badge({ variant = "default", children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
