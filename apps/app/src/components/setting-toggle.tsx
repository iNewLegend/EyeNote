"use client";

import { Label, Switch } from "@eye-note/ui";

type SettingToggleProps = {
    id : string;
    label : string;
    description : string;
    checked : boolean;
    onCheckedChange : ( value : boolean ) => void;
    disabled ?: boolean;
};

export function SettingToggle ( {
    id,
    label,
    description,
    checked,
    onCheckedChange,
    disabled = false,
} : SettingToggleProps ) {
    return (
        <div
            className="flex items-center justify-between space-x-4 rounded-lg border border-border/60 bg-background/60 px-4 py-3"
            data-disabled={disabled ? "true" : undefined}
        >
            <div className="space-y-1">
                <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </div>
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
            />
        </div>
    );
}

export type { SettingToggleProps };
