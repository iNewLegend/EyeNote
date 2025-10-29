import * as React from "react";

import { cn } from "../lib/utils";
import { Button, type ButtonProps } from "./ui/button";
import { CardContent } from "./ui/card";

import defaultIcon from "../assets/icon.svg";

type SignInPromptVariant = "card" | "callout";

type SignInPromptProps = {
    onGetStarted : () => void;
    isSigningIn ?: boolean;
    iconAlt ?: string;
    title ?: React.ReactNode;
    description ?: React.ReactNode;
    getStartedLabel ?: React.ReactNode;
    signingInLabel ?: React.ReactNode;
    variant ?: SignInPromptVariant;
    className ?: string;
    contentClassName ?: string;
    buttonProps ?: Omit<ButtonProps, "onClick" | "disabled" | "children">;
    showIcon ?: boolean;
};

export function SignInPrompt ( {
    onGetStarted,
    isSigningIn = false,
    iconAlt = "EyeNote Logo",
    title = "Welcome to EyeNote",
    description = "Sign in to start creating and sharing notes across the web.",
    getStartedLabel = "Get Started",
    signingInLabel = "Signing In...",
    variant = "card",
    className,
    contentClassName,
    buttonProps,
    showIcon = true,
} : SignInPromptProps ) {
    const { size : buttonSize = "lg", ...restButtonProps } = buttonProps ?? {};
    const isCallout = variant === "callout";
    const Wrapper = isCallout ? "div" : CardContent;
    const wrapperClassName = isCallout
        ? "space-y-4 rounded-lg border border-dashed border-border/70 bg-muted/10 p-6 text-left"
        : "flex-1 flex flex-col items-center justify-center p-6";
    const containerClassName = isCallout ? "space-y-4" : "space-y-8 text-center";
    const iconWrapperClassName = isCallout ? "w-fit" : "mx-auto w-fit";

    return (
        <Wrapper className={cn( wrapperClassName, className )}>
            <div className={cn( containerClassName, contentClassName )}>
                <div className="space-y-6">
                    {showIcon ? (
                        <div className={iconWrapperClassName}>
                            <img
                                src={defaultIcon}
                                alt={iconAlt}
                                className="w-24 h-24 animate-in zoom-in duration-500"
                                loading="lazy"
                            />
                        </div>
                    ) : null}
                    <div className="space-y-2">
                        <h3 className={cn( "text-xl font-semibold", isCallout ? "text-left" : undefined )}>
                            {title}
                        </h3>
                        <p className={cn( "text-sm text-muted-foreground", isCallout ? "text-left" : undefined )}>
                            {description}
                        </p>
                    </div>
                </div>
                <Button
                    size={buttonSize}
                    onClick={onGetStarted}
                    disabled={isSigningIn}
                    {...restButtonProps}
                >
                    {isSigningIn ? signingInLabel : getStartedLabel}
                </Button>
            </div>
        </Wrapper>
    );
}

export type { SignInPromptProps, SignInPromptVariant };
