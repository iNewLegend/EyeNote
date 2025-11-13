import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Sheet, SheetContent, cn } from "@eye-note/ui";

type SheetProps = ComponentPropsWithoutRef<typeof Sheet>;
type SheetContentProps = ComponentPropsWithoutRef<typeof SheetContent>;

type SidebarSheetProps = Omit<SheetProps, "children"> & {
    container ?: HTMLElement | null;
    contentProps ?: Omit<SheetContentProps, "children" | "container" | "side">;
    className ?: string;
    children : ReactNode;
};

export function SidebarSheet ( {
    container,
    contentProps,
    className,
    children,
    ...sheetProps
} : SidebarSheetProps ) {
    const { className: contentClassName, ...restContentProps } = contentProps ?? {};

    return (
        <Sheet {...sheetProps}>
            <SheetContent
                side="right"
                container={container ?? undefined}
                className={cn(
                    "sidebar-sheet w-full sm:max-w-md max-h-screen flex flex-col bg-background/95 backdrop-blur px-6 py-5 gap-4 border-l border-border text-foreground shadow-2xl",
                    contentClassName,
                    className
                )}
                {...restContentProps}
            >
                {children}
            </SheetContent>
        </Sheet>
    );
}
