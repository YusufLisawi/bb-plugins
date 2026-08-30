import type { ReactNode } from "react";
import { Label } from "../../components/ui/label.js";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import { cn } from "../../lib/utils.js";

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  disabled?: boolean;
}

/**
 * A compact BB-native select with an associated visible (or screen-reader)
 * label. Radix reserves an empty string for an unset value, so callers can
 * use it naturally while keeping their option values non-empty.
 */
export function SelectField({
  id,
  label,
  value,
  onValueChange,
  placeholder = label,
  children,
  className,
  labelClassName,
  disabled = false,
}: SelectFieldProps) {
  const labelId = `${id}-label`;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label id={labelId} htmlFor={id} className={cn("text-xs", labelClassName)}>
        {label}
      </Label>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} aria-labelledby={labelId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
