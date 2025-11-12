import React from "react";
import { Button } from "@eye-note/ui";
import { Menu, Users } from "lucide-react";

interface QuickControlsSectionProps {
    onOpenQuickMenu: () => void;
    onOpenGroupManager: () => void;
}

export function QuickControlsSection ( { onOpenQuickMenu, onOpenGroupManager }: QuickControlsSectionProps ) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Quick controls</h2>
            </div>
            <p className="text-sm text-muted-foreground">
                Launch in-page tools without leaving your current tab. Each button
                opens a content overlay inside the site you are viewing.
            </p>
            <div className="grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    className="w-full justify-between rounded-full"
                    onClick={onOpenQuickMenu}
                >
                    <span>Menu</span>
                    <Menu className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="w-full justify-between rounded-full"
                    onClick={onOpenGroupManager}
                >
                    <span>Manage Groups</span>
                    <Users className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

