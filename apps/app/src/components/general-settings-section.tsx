"use client";

import { SignInPrompt } from "@eye-note/ui";

import type { AppSettings } from "../hooks/use-dashboard-settings";
import { ResetBanner } from "./reset-banner";
import { SettingToggle } from "./setting-toggle";

type AppSettingDescriptor = {
    key : keyof AppSettings;
    label : string;
    description : string;
};

type GeneralSettingsSectionProps = {
    descriptors : AppSettingDescriptor[];
    settings : AppSettings;
    onToggle : ( key : keyof AppSettings, value : boolean ) => void;
    onReset : () => void;
    onSignIn : () => void;
    isAuthenticated : boolean;
    isLoading : boolean;
};

export function GeneralSettingsSection ( {
    descriptors,
    settings,
    onToggle,
    onReset,
    onSignIn,
    isAuthenticated,
    isLoading,
} : GeneralSettingsSectionProps ) {
    return (
        <div className="space-y-4">
            {!isAuthenticated ? (
                <SignInPrompt
                    onGetStarted={onSignIn}
                    isSigningIn={isLoading}
                    getStartedLabel="Sign in with Google"
                    signingInLabel="Signing in..."
                    title="Sign in to manage overlay settings"
                    description="Connect your Google account to sync EyeNote preferences across the extension and app."
                    variant="callout"
                    showIcon={false}
                />
            ) : null}
            {descriptors.map( ( descriptor ) => (
                <SettingToggle
                    key={descriptor.key as string}
                    id={`settings-${ String( descriptor.key ) }`}
                    label={descriptor.label}
                    description={descriptor.description}
                    checked={settings[ descriptor.key ]}
                    onCheckedChange={( next ) => onToggle( descriptor.key, next )}
                    disabled={!isAuthenticated}
                />
            ) )}
            <ResetBanner onReset={onReset} disabled={!isAuthenticated} />
        </div>
    );
}

export type { AppSettingDescriptor, GeneralSettingsSectionProps };
