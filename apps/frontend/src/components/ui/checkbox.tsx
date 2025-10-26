import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ( { className, checked, defaultChecked, disabled, ...props }, ref ) => (
        <label
            className={cn(
                "inline-flex h-4 w-4 items-center justify-center rounded-sm border border-input bg-background text-primary transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                disabled && "cursor-not-allowed opacity-50",
                className
            )}
        >
            <input
                ref={ref}
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                defaultChecked={defaultChecked}
                disabled={disabled}
                {...props}
            />
            <span className="pointer-events-none flex items-center justify-center text-current peer-checked:opacity-100 peer-checked:scale-100 opacity-0 scale-75 transition-all duration-150">
                <CheckIcon className="h-3 w-3" />
            </span>
        </label>
    )
);
Checkbox.displayName = "Checkbox";
