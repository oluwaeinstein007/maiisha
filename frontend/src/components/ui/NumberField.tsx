import { forwardRef, type ComponentProps } from "react";
import { sanitizeNumeric } from "@/lib/number";
import { Input } from "./Field";

interface NumberFieldProps extends Omit<ComponentProps<typeof Input>, "type" | "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  /** Allow one decimal point (£ amounts). Whole numbers (stock, sort order…) omit this. */
  decimal?: boolean;
}

/**
 * A numeric text field that never shows a value React doesn't also hold — see
 * `lib/number.ts` for why plain `type="number"` can't guarantee that. Renders
 * as `type="text"` with a numeric keyboard on mobile (`inputMode`); the
 * browser's spin buttons go away, which every form here already coped without.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  ({ value, onChange, decimal, ...props }, ref) => (
    <Input
      ref={ref}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={value}
      onChange={(e) => onChange(sanitizeNumeric(e.target.value, { decimal }))}
      {...props}
    />
  ),
);
NumberField.displayName = "NumberField";
