/* shadcn/ui Field composition, kept dependency-light for BB plugins. */
import * as React from "react";

import { cn } from "../../lib/utils";
import { Label } from "./label.js";

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { invalid?: boolean }
>(({ className, invalid = false, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    data-invalid={invalid || undefined}
    className={cn("group/field grid min-w-0 gap-1.5", className)}
    {...props}
  />
));
Field.displayName = "Field";

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("grid min-w-0 gap-4", className)}
    {...props}
  />
));
FieldGroup.displayName = "FieldGroup";

const FieldLabel = React.forwardRef<
  React.ComponentRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn(
      "w-fit text-xs font-medium text-foreground group-data-[invalid=true]/field:text-destructive",
      className,
    )}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs leading-5 text-muted-foreground", className)}
    {...props}
  />
));
FieldDescription.displayName = "FieldDescription";

const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    role="alert"
    className={cn("text-xs leading-5 text-destructive", className)}
    {...props}
  />
));
FieldError.displayName = "FieldError";

const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset
    ref={ref}
    className={cn("grid min-w-0 gap-3 border-0 p-0", className)}
    {...props}
  />
));
FieldSet.displayName = "FieldSet";

const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement>
>(({ className, ...props }, ref) => (
  <legend
    ref={ref}
    className={cn("text-sm font-medium text-foreground", className)}
    {...props}
  />
));
FieldLegend.displayName = "FieldLegend";

export {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
};
