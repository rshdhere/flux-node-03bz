"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3 text-[var(--text)] placeholder:text-[var(--muted)] transition hover:border-[var(--accent)]/60 focus:border-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
});
