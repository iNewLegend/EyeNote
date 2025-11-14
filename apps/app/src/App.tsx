import { useSearchParams } from "react-router-dom";
import { useAppAuth } from "@eye-note/auth/app";
import { useGroupsBootstrap, useGroupsStore } from "@eye-note/groups";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Toaster } from "@eye-note/ui";
import { LockKeyhole } from "lucide-react";
import { AppHeader } from "./components/layout/app-header";
import { HeroSection } from "./components/layout/hero-section";
import { InviteJoinForm } from "./components/invitations/invite-join-form";
import { InviteManager } from "./components/invitations/invite-manager";
import { GroupsOverview } from "./components/invitations/groups-overview";

export default function App () {
    const { user, isAuthenticated, isLoading, signIn, signOut } = useAppAuth();
    const [ searchParams ] = useSearchParams();
    const inviteFromUrl = searchParams.get( "invite" );

    useGroupsBootstrap( {
        isAuthenticated,
        canSync: isAuthenticated,
        shouldResetOnUnsync: true,
        logContext: "web-app",
    } );

    const groups = useGroupsStore( ( state ) => state.groups );
    const groupsLoading = useGroupsStore( ( state ) => state.isLoading );

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#050014] via-[#0b0620] to-[#111033] text-foreground">
            <AppHeader
                userName={user?.name ?? user?.email ?? undefined}
                isAuthenticated={isAuthenticated}
                isLoading={isLoading}
                onSignIn={() => {
                    void signIn();
                }}
                onSignOut={() => {
                    void signOut();
                }}
            />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
                <HeroSection />
                {isAuthenticated ? (
                    <>
                        <section className="grid gap-6 lg:grid-cols-2">
                            <InviteJoinForm initialInviteCode={inviteFromUrl} />
                            <GroupsOverview groups={groups} isLoading={groupsLoading} />
                        </section>
                        <InviteManager canManageGroups={isAuthenticated} />
                    </>
                ) : (
                    <SignedOutHero onSignIn={() => void signIn()} isLoading={isLoading} />
                )}
            </main>
            <Toaster position="top-center" richColors />
        </div>
    );
}

interface SignedOutHeroProps {
    onSignIn : () => void;
    isLoading : boolean;
}

function SignedOutHero ( { onSignIn, isLoading } : SignedOutHeroProps ) {
    return (
        <Card className="mx-auto w-full max-w-3xl border border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
                <CardTitle className="text-2xl">Manage invites in one place</CardTitle>
                <CardDescription>
                    Sign in with Google to create Discord-style invites, approve join requests, and keep track of who can
                    access your EyeNote spaces.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    EyeNote uses Google Sign-In to protect your groups. We only request your basic profile information to
                    verify your identity.
                </p>
                <Button
                    onClick={onSignIn}
                    disabled={isLoading}
                    className="gap-2"
                >
                    <LockKeyhole className="h-4 w-4" />
                    {isLoading ? "Opening Google…" : "Sign in with Google"}
                </Button>
            </CardContent>
        </Card>
    );
}
