import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary: "bg-fd-leather text-white hover:bg-fd-leather-hover disabled:opacity-50",
  secondary: "bg-white text-fd-cacao border border-fd-khaki hover:bg-fd-pearl disabled:opacity-50",
  ghost: "bg-transparent text-fd-cacao hover:bg-fd-khaki/40 disabled:opacity-50",
  danger: "bg-fd-error text-white hover:opacity-90 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
