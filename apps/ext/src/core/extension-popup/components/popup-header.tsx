import React from "react";
import { Button, CardDescription, CardHeader, CardTitle } from "@eye-note/ui";
import { useAuthStore } from "@eye-note/auth/extension";

interface PopupHeaderProps {
    isBackendDown: boolean;
    isAuthenticated: boolean;
    onSignOut: () => void;
}

export function PopupHeader ( { isBackendDown, isAuthenticated, onSignOut }: PopupHeaderProps ) {
    const authUser = useAuthStore( ( state ) => state.user );

    return (
        <CardHeader className="pb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
                        EyeNote
                    </CardTitle>
                    {!isBackendDown && isAuthenticated && authUser && (
                        <CardDescription className="text-sm">{authUser.name}</CardDescription>
                    )}
                </div>
                {!isBackendDown && isAuthenticated && (
                    <div className="flex items-center gap-2">
                        {authUser?.picture && (
                            <img
                                src={authUser.picture}
                                alt={authUser.name}
                                className="w-8 h-8 rounded-full ring-1 ring-border"
                            />
                        )}
                        <Button variant="ghost" size="sm" onClick={onSignOut}>
                            Sign Out
                        </Button>
                    </div>
                )}
            </div>
        </CardHeader>
    );
}

