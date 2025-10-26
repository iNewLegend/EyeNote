import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground focus:ring-primary",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground focus:ring-secondary",
                outline: "border-border bg-transparent text-foreground focus:ring-border",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground focus:ring-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ( { className, variant, ...props }, ref ) => (
        <span ref={ref} className={cn( badgeVariants( { variant } ), className )} {...props} />
    )
);

Badge.displayName = "Badge";
