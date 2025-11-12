import React, { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Label } from "@eye-note/ui";
import { useGroupsStore } from "../../../modules/groups";

export function JoinGroupForm () {
    const [ inviteCodeInput, setInviteCodeInput ] = useState( "" );
    const [ isJoiningGroup, setIsJoiningGroup ] = useState( false );
    const joinGroupByCode = useGroupsStore( ( state ) => state.joinGroupByCode );

    const handleSubmit = async ( event: React.FormEvent<HTMLFormElement> ) => {
        event.preventDefault();
        const inviteCode = inviteCodeInput.trim();

        if ( inviteCode.length === 0 ) {
            toast( "Invite code required", {
                description: "Enter a group's invite code to join.",
            } );
            return;
        }

        try {
            setIsJoiningGroup( true );
            const { group, joined } = await joinGroupByCode( inviteCode );
            setInviteCodeInput( "" );
            toast( joined ? "Joined group" : "Already a member", {
                description: joined
                    ? `You're ready to collaborate in ${ group.name }.`
                    : `You're already part of ${ group.name }.`,
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to join group";
            toast( "Error", {
                description: message,
            } );
        } finally {
            setIsJoiningGroup( false );
        }
    };

    return (
        <form
            className="space-y-3 rounded-lg border border-border/60 p-4"
            onSubmit={handleSubmit}
        >
            <div className="space-y-2">
                <Label htmlFor="popup-join-group-code" className="text-sm font-medium">
                    Invite code
                </Label>
                <Input
                    id="popup-join-group-code"
                    value={inviteCodeInput}
                    onChange={( event ) => setInviteCodeInput( event.target.value )}
                    placeholder="EN-XXXXXX"
                    autoComplete="off"
                    maxLength={24}
                />
            </div>
            <Button type="submit" className="w-full" disabled={isJoiningGroup}>
                {isJoiningGroup ? "Joining..." : "Join"}
            </Button>
        </form>
    );
}

