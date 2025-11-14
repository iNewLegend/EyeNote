import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@eye-note/ui";
import { getGroupsApiClient, useGroupsStore } from "@eye-note/groups";
import { toast } from "sonner";
import { CheckCircle2, Hourglass, Sparkles } from "lucide-react";

interface InviteJoinFormProps {
    initialInviteCode ?: string | null;
}

type JoinStatus = {
    groupName : string;
    state : "joined" | "pending" | "existing";
};

export function InviteJoinForm ( { initialInviteCode } : InviteJoinFormProps ) {
    const [ inviteCode, setInviteCode ] = useState( initialInviteCode ?? "" );
    const [ isJoining, setIsJoining ] = useState( false );
    const [ result, setResult ] = useState<JoinStatus | null>( null );
    const fetchGroups = useGroupsStore( ( state ) => state.fetchGroups );

    useEffect( () => {
        if ( initialInviteCode ) {
            setInviteCode( initialInviteCode );
        }
    }, [ initialInviteCode ] );

    const hint = useMemo( () => {
        if ( !initialInviteCode ) {
            return "Paste an invite link or six-character code";
        }
        return "We prefilled the code from your invite link."
    }, [ initialInviteCode ] );

    const handleSubmit = async ( event : FormEvent<HTMLFormElement> ) => {
        event.preventDefault();
        if ( inviteCode.trim().length === 0 ) {
            toast( "Enter an invite", { description: "Paste a link or code before joining." } );
            return;
        }

        setIsJoining( true );
        try {
            const client = getGroupsApiClient();
            const response = await client.joinGroupByCode( inviteCode.trim() );
            const status : JoinStatus = {
                groupName: response.group.name,
                state: response.joined ? "joined" : response.requiresApproval ? "pending" : "existing",
            };
            setResult( status );
            await fetchGroups();

            if ( status.state === "joined" ) {
                toast( "You're in!", { description: `Welcome to ${ response.group.name }.` } );
            } else if ( status.state === "pending" ) {
                toast( "Request sent", { description: "A group manager will review it shortly." } );
            } else {
                toast( "Already in", { description: "You're already a member of this group." } );
            }
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to join group";
            toast( "Unable to join", { description: message } );
        } finally {
            setIsJoining( false );
        }
    };

    return (
        <Card className="border border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="space-y-1">
                <CardTitle className="text-lg">Join a group</CardTitle>
                <CardDescription>{hint}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="invite-code">Invite link or code</Label>
                        <Input
                            id="invite-code"
                            value={inviteCode}
                            onChange={( event ) => setInviteCode( event.target.value )}
                            placeholder="EN-ABCD12 or https://app.eyenote.dev/?invite=ABCD12"
                        />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={isJoining}>
                        <Sparkles className="h-4 w-4" />
                        {isJoining ? "Joining…" : "Join group"}
                    </Button>
                </form>

                {result ? (
                    <div className="mt-6 rounded-lg border border-border/50 bg-secondary/30 p-4 text-sm">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                            {result.state === "joined" ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : result.state === "pending" ? (
                                <Hourglass className="h-4 w-4 text-amber-400" />
                            ) : (
                                <Sparkles className="h-4 w-4 text-muted-foreground" />
                            )}
                            {result.state === "joined"
                                ? `You're now part of ${ result.groupName }`
                                : result.state === "pending"
                                    ? `Join request sent to ${ result.groupName }`
                                    : `You're already a member of ${ result.groupName }`}
                        </p>
                        {result.state === "pending" ? (
                            <p className="mt-1 text-muted-foreground">
                                We'll notify the group managers and email you once you're approved.
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
