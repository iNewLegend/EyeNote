"use client";

export function Header () {
    return (
        <header className="space-y-3 text-center md:text-left">
            <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    EyeNote App
                </h1>
                <p className="text-base text-muted-foreground">
                    Configure collaboration and overlay preferences from a standalone web experience.
                </p>
            </div>
        </header>
    );
}
