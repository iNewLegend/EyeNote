import React from "react";

export function HelpTip () {
    return (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
            <div className="flex gap-3 items-start">
                <div className="p-1.5 bg-primary/20 rounded-md">
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                    </svg>
                </div>
                <p className="text-sm text-primary-foreground/80">
                    Hold{" "}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono border rounded-md bg-muted">
                        SHIFT
                    </kbd>{" "}
                    + Click to create a note on any webpage element.
                </p>
            </div>
        </div>
    );
}

