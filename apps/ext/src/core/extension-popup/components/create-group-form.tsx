import React, { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Label } from "@eye-note/ui";
import { useGroupsStore } from "../../../modules/groups";

const DEFAULT_GROUP_COLOR = "#6366f1";

export function CreateGroupForm () {
    const [ newGroupName, setNewGroupName ] = useState( "" );
    const [ isCreatingGroup, setIsCreatingGroup ] = useState( false );
    const createGroup = useGroupsStore( ( state ) => state.createGroup );

    const handleSubmit = async ( event: React.FormEvent<HTMLFormElement> ) => {
        event.preventDefault();
        const name = newGroupName.trim();

        if ( name.length === 0 ) {
            toast( "Group name required", {
                description: "Enter a team name before creating a group.",
            } );
            return;
        }

        try {
            setIsCreatingGroup( true );
            const group = await createGroup( { name, color: DEFAULT_GROUP_COLOR } );
            setNewGroupName( "" );
            toast( "Group created", {
                description: `Share invite code ${ group.inviteCode } with teammates.`,
            } );
        } catch ( error ) {
            const message = error instanceof Error ? error.message : "Failed to create group";
            toast( "Error", {
                description: message,
            } );
        } finally {
            setIsCreatingGroup( false );
        }
    };

    return (
        <form
            className="space-y-3 rounded-lg border border-border/60 p-4"
            onSubmit={handleSubmit}
        >
            <div className="space-y-2">
                <Label htmlFor="popup-create-group-name" className="text-sm font-medium">
                    Team name
                </Label>
                <Input
                    id="popup-create-group-name"
                    value={newGroupName}
                    onChange={( event ) => setNewGroupName( event.target.value )}
                    placeholder="Acme Product Team"
                    autoComplete="off"
                    maxLength={60}
                />
            </div>
            <Button type="submit" className="w-full" disabled={isCreatingGroup}>
                {isCreatingGroup ? "Creating..." : "Create"}
            </Button>
        </form>
    );
}

