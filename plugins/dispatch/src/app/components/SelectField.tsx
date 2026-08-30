import type { ReactNode } from "react";
import { Field, FieldError, FieldLabel } from "../../../components/ui/field.js";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import { cn } from "../../lib/utils.js";
import { FORM_CONTROL_CLASS, PROPERTY_CONTROL_CLASS } from "./controlStyles.js";

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  triggerClassName?: string;
  disabled?: boolean;
  variant?: "default" | "property";
  error?: string;
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
  triggerClassName,
  disabled = false,
  variant = "default",
  error,
}: SelectFieldProps) {
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  return (
    <Field className={className} invalid={Boolean(error)}>
      <FieldLabel
        id={labelId}
        htmlFor={id}
        className={cn(
          variant === "property" && "text-[11px] font-medium text-muted-foreground",
          labelClassName,
        )}
      >
        {label}
      </FieldLabel>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-labelledby={labelId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            variant === "property" ? PROPERTY_CONTROL_CLASS : FORM_CONTROL_CLASS,
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent><SelectGroup>{children}</SelectGroup></SelectContent>
      </Select>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
