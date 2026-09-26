import {
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  forwardRef,
  useId,
} from "react";
import clsx from "clsx";

const baseInputClasses =
  "w-full rounded-md border border-ink/20 bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-ink-soft/50 outline-none transition-colors focus:border-gold disabled:bg-ink/5 sm:text-sm";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export function FieldWrapper({ label, error, hint, htmlFor, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-ink-soft/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Every field needs an id for its <label> to be bound to it — without one,
 * screen readers can't name the field and tapping the label on a phone doesn't
 * focus it. Callers rarely pass one, so fall back to a generated id.
 */
function useFieldIds(id: string | undefined, error?: string, hint?: string) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return { fieldId, describedBy };
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const { fieldId, describedBy } = useFieldIds(id, error, hint);

    return (
      <FieldWrapper label={label} error={error} hint={hint} htmlFor={fieldId}>
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(baseInputClasses, error && "border-red-400", className)}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const { fieldId, describedBy } = useFieldIds(id, error, hint);

    return (
      <FieldWrapper label={label} error={error} hint={hint} htmlFor={fieldId}>
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(baseInputClasses, "min-h-[100px]", error && "border-red-400", className)}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, id, className, children, ...props }, ref) => {
    const { fieldId, describedBy } = useFieldIds(id, error, hint);

    return (
      <FieldWrapper label={label} error={error} hint={hint} htmlFor={fieldId}>
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(baseInputClasses, error && "border-red-400", className)}
          {...props}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  },
);
Select.displayName = "Select";
