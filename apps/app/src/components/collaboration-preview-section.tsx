"use client";

import { Users } from "lucide-react";

import { Badge, Button, SignInPrompt } from "@eye-note/ui";

type CollaborationPreviewSectionProps = {
    highlights : string[];
    isAuthenticated : boolean;
    isLoading : boolean;
    onSignIn : () => void;
    onNotify : () => void;
    onLearnMore : () => void;
};

export function CollaborationPreviewSection ( {
    highlights,
    isAuthenticated,
    isLoading,
    onSignIn,
    onNotify,
    onLearnMore,
} : CollaborationPreviewSectionProps ) {
    return (
        <div className="space-y-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
                Coming soon
            </Badge>
            <div className="space-y-4 text-sm text-muted-foreground">
                {!isAuthenticated ? (
                    <SignInPrompt
                        onGetStarted={onSignIn}
                        isSigningIn={isLoading}
                        getStartedLabel="Sign in with Google"
                        signingInLabel="Signing in..."
                        title="Sign in to preview collaboration tools."
                        description="Once you connect your account, you'll unlock the upcoming app experience for managing groups and invites."
                        variant="callout"
                        showIcon={false}
                        buttonProps={{ size: "sm" }}
                    />
                ) : null}
                <div className="space-y-2 text-foreground">
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Users className="h-4 w-4" />
                        Manage collaboration groups
                    </div>
                    <p>
                        We&apos;re moving group management into the app so you can configure
                        invites and roles without the browser extension.
                    </p>
                </div>
                <ul className="space-y-3">
                    {highlights.map( ( item ) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>{item}</span>
                        </li>
                    ) )}
                </ul>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Button
                        type="button"
                        disabled={!isAuthenticated}
                        onClick={onNotify}
                    >
                        Notify me
                    </Button>
                    <Button
                        variant="outline"
                        type="button"
                        disabled={!isAuthenticated}
                        onClick={onLearnMore}
                    >
                        Learn more
                    </Button>
                </div>
            </div>
        </div>
    );
}

export type { CollaborationPreviewSectionProps };
