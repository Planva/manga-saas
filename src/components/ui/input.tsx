// src/components/ui/input.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", value, defaultValue, onChange, ...rest }, ref) => {
    const isControlled = value !== undefined;

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted dark:border-border/80 md:text-sm",
          className
        )}
        ref={ref}
        // 只有受控时才传 value，并把 undefined/null 归一为 ""，避免 uncontrolled→controlled 警告
        {...(isControlled ? { value: value ?? "" } : { defaultValue })}
        onChange={onChange}
        {...rest}
      />
    );
  }
);

Input.displayName = "Input";
export default Input;
