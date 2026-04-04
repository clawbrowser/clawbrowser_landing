import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const variants = {
  default:
    "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
  outline:
    "border border-zinc-300 bg-transparent hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900",
  ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-900",
};

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3 text-xs",
  lg: "h-12 rounded-md px-8 text-base",
};

type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  href?: string;
};

export function Button({
  children,
  className,
  variant = "default",
  size = "default",
  href,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <button type="button" className={classes}>{children}</button>;
}
