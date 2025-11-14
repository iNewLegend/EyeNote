export function HeroSection () {
    return (
        <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-primary">Groups</p>
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
                Discord-style invitations for the open web
            </h1>
            <p className="text-base text-muted-foreground">
                Generate invite links for every team, share them securely, and track their status without opening the
                browser extension. Perfect for onboarding teammates before they install EyeNote.
            </p>
        </section>
    );
}
