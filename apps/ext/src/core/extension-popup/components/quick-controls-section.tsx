import { Button } from "@eye-note/ui";
import { Menu } from "lucide-react";

interface QuickControlsSectionProps {
    onOpenQuickMenu: () => void;
}

export function QuickControlsSection ( { onOpenQuickMenu }: QuickControlsSectionProps ) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Quick controls</h2>
            </div>
            <p className="text-sm text-muted-foreground">
                Launch the quick menu to open groups, notifications, or settings without
                leaving your current tab.
            </p>
            <Button
                variant="outline"
                className="w-full justify-between rounded-full"
                onClick={onOpenQuickMenu}
            >
                <span>Menu</span>
                <Menu className="h-4 w-4" />
            </Button>
        </div>
    );
}
