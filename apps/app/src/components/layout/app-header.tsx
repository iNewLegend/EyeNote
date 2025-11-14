import { Button } from "@eye-note/ui";
import { LogIn, LogOut } from "lucide-react";

interface AppHeaderProps {
    userName ?: string;
    isAuthenticated : boolean;
    isLoading : boolean;
    onSignIn : () => void;
    onSignOut : () => void;
}

export function AppHeader ( { userName, isAuthenticated, isLoading, onSignIn, onSignOut } : AppHeaderProps ) {
    return (
        <header className="sticky top-0 z-50 backdrop-blur border-b border-border/40 bg-background/80">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary font-semibold">
                        EN
                    </div>
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">EyeNote</p>
                        <p className="text-base font-semibold">Invitations Portal</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {isAuthenticated && userName ? (
                        <span className="hidden sm:inline">Welcome, {userName}</span>
                    ) : null}
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={isLoading}
                        onClick={isAuthenticated ? onSignOut : onSignIn}
                        className="gap-2"
                    >
                        {isAuthenticated ? (
                            <>
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </>
                        ) : (
                            <>
                                <LogIn className="h-4 w-4" />
                                Sign in
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </header>
    );
}
