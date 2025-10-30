"use client";

import { RefreshCw } from "lucide-react";

import { Button, toast } from "@eye-note/ui";

type ResetBannerProps = {
    onReset : () => void;
    disabled ?: boolean;
};

export function ResetBanner ( {
    onReset,
    disabled = false,
} : ResetBannerProps ) {
    const handleClick = () => {
        if ( disabled ) {
            return;
        }
        onReset();
        toast( {
            title: "Settings reset",
            description: "App preferences have been restored to defaults.",
        } );
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/40 p-4">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold">Reset app settings</h3>
                <p className="text-sm text-muted-foreground">
                    Restore the default configuration for the standalone app.
                </p>
            </div>
            <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={handleClick}
            >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
            </Button>
        </div>
    );
}

export type { ResetBannerProps };
