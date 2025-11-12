import { useEffect, useMemo, useState } from "react";
import {
    cn,
    Button,
    Input,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@eye-note/ui";
import type { Note } from "../../../types";
import { useAuthStore } from "@eye-note/auth/extension";
import { useNoteChatStore } from "../chat-store";
import type { NoteChatMessage } from "../chat-store";
import { useRealtimeStore } from "../../realtime/realtime-store";
import { useGroupsStore } from "../../../modules/groups";

const EMPTY_CHAT_MESSAGES : NoteChatMessage[] = [];

export interface NoteGroupOption {
    id : string;
    name : string;
    color ?: string;
}

type NoteScreenshot = NonNullable<Note["screenshots"]>[ number ];

const GROUP_SWATCH_FALLBACK = "#94a3b8";
const SELECT_EMPTY_VALUE = "__none__";

const resolveGroupColor = ( color ?: string ) => ( color && color.trim().length > 0 ? color : GROUP_SWATCH_FALLBACK );

interface NoteSheetProps {
    note : Note;
    container : HTMLElement | null;
    open : boolean;
    onOpenChange : ( open : boolean ) => void;
    groupColor : string;
    groupLabel : string;
    screenshots : NoteScreenshot[];
    isCapturingScreenshots : boolean;
    onImageClick : ( index : number ) => void;
    selectOptions : NoteGroupOption[];
    selectedGroupId : string;
    onSelectedGroupIdChange : ( value : string ) => void;
    draftContent : string;
    onDraftContentChange : ( value : string ) => void;
    isActionLocked : boolean;
    onCancel : () => void;
    onDelete : () => void;
    onSave : () => void;
    isDeleting : boolean;
    isSaving : boolean;
    isExistingPending : boolean;
}

export function NoteSheet ( {
    note,
    container,
    open,
    onOpenChange,
    groupColor,
    groupLabel,
    screenshots,
    isCapturingScreenshots,
    onImageClick,
    selectOptions,
    selectedGroupId,
    onSelectedGroupIdChange,
    draftContent,
    onDraftContentChange,
    isActionLocked,
    onCancel,
    onDelete,
    onSave,
    isDeleting,
    isSaving,
    isExistingPending,
} : NoteSheetProps ) {
    const [ isSelectOpen, setIsSelectOpen ] = useState( false );
    const [ chatDraft, setChatDraft ] = useState( "" );
    const [ isSendingChat, setIsSendingChat ] = useState( false );
    const groupLabelId = `note-group-label-${ note.id }`;
    const groupTriggerId = `note-group-${ note.id }`;
    const authUser = useAuthStore( ( state ) => state.user );
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );
    const chatMessages = useNoteChatStore(
        ( state ) => state.messages[ note.id ] ?? EMPTY_CHAT_MESSAGES
    ) as NoteChatMessage[];
    const chatLoading = useNoteChatStore( ( state ) => state.isLoading[ note.id ] ?? false );
    const chatHasMore = useNoteChatStore( ( state ) => state.hasMore[ note.id ] ?? false );
    const fetchChatMessages = useNoteChatStore( ( state ) => state.fetchMessages );
    const fetchOlderChatMessages = useNoteChatStore( ( state ) => state.fetchOlderMessages );
    const realtimeStatus = useRealtimeStore( ( state ) => state.status );
    const joinNoteRoom = useRealtimeStore( ( state ) => state.joinNoteRoom );
    const leaveNoteRoom = useRealtimeStore( ( state ) => state.leaveNoteRoom );
    const sendRealtimeMessage = useRealtimeStore( ( state ) => state.sendMessage );
    const isChatEnabled = Boolean( note.groupId );
    const activeGroupKey = activeGroupIds.join( "|" );
    useEffect( () => {
        if ( !open || !isChatEnabled ) {
            return;
        }

        if ( chatMessages.length === 0 && !chatLoading ) {
            void fetchChatMessages( note.id );
        }

        void joinNoteRoom( note.id );

        return () => {
            leaveNoteRoom( note.id );
        };
    }, [
        open,
        isChatEnabled,
        note.id,
        note.groupId,
        chatMessages.length,
        chatLoading,
        activeGroupKey,
        joinNoteRoom,
        leaveNoteRoom,
        fetchChatMessages,
    ] );

    const handleSendChat = async () => {
        if ( !authUser || !isChatEnabled || isSendingChat ) {
            return;
        }

        const trimmed = chatDraft.trim();
        if ( trimmed.length === 0 ) {
            return;
        }

        setIsSendingChat( true );
        try {
            await sendRealtimeMessage( {
                note: { id: note.id, groupId: note.groupId },
                content: trimmed,
                userId: authUser.id,
            } );
            setChatDraft( "" );
        } catch ( error ) {
            console.error( "[EyeNote] Failed to send chat message", error );
        } finally {
            setIsSendingChat( false );
        }
    };

    const chatStatusLabel = useMemo( () => {
        switch ( realtimeStatus ) {
            case "connected":
                return "Connected";
            case "connecting":
                return "Connecting…";
            case "error":
                return "Realtime unavailable";
            default:
                return "Disconnected";
        }
    }, [ realtimeStatus ] );

    const canSendChat = Boolean( authUser && isChatEnabled && chatDraft.trim().length > 0 && !isSendingChat );

    const handleSelectOpenChange = ( open : boolean ) => {
        setIsSelectOpen( open );
        console.debug( "[EyeNote] Note sheet group select open:", {
            open,
            noteId: note.id,
        } );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                {...( container ? { container } : {} )}
                side="right"
                className={cn(
                    "note-content w-full sm:max-w-md flex flex-col outline-none opacity-50 hover:opacity-100 transition-opacity duration-200",
                    isSelectOpen && "opacity-100"
                )}
                onPointerDownOutside={( event ) => {
                    if ( note.isLocalDraft ) {
                        event.preventDefault();
                        return;
                    }
                    onOpenChange( false );
                }}
                onInteractOutside={( event ) => {
                    if ( note.isLocalDraft ) {
                        event.preventDefault();
                    }
                }}
            >
                <SheetTitle className="sr-only">Add Note</SheetTitle>
                <SheetDescription className="sr-only">
                    Add or edit your note for the selected element. Use the textarea below to write your note,
                    then click Save to confirm or Delete to remove the note.
                </SheetDescription>
                <div className="flex flex-col h-full gap-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b border-border/50">
                        <span
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: groupColor }}
                        />
                        <span>{groupLabel}</span>
                    </div>
                    {( screenshots.length > 0 ) || isCapturingScreenshots ? (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Element Capture
                            </label>
                            {isCapturingScreenshots ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {[ 1, 2 ].map( ( zoom ) => (
                                        <div
                                            key={zoom}
                                            className="relative rounded-md overflow-hidden border border-border/50 bg-background/40 flex flex-col items-center justify-center"
                                            style={{ minHeight: "150px", maxHeight: "300px" }}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                                                <div className="text-xs text-muted-foreground">
                                                    { `Capturing ${ zoom }x...` }
                                                </div>
                                            </div>
                                        </div>
                                    ) )}
                                </div>
                            ) : screenshots.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {screenshots.map( ( screenshot, index ) => (
                                        <div
                                            key={`${ note.id }-${ index }`}
                                            className="relative rounded-md overflow-hidden border border-border/50 bg-background/40 cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => onImageClick( index )}
                                        >
                                            <img
                                                src={screenshot.dataUrl}
                                                alt={ `Element capture at ${ screenshot.zoom }x zoom` }
                                                className="w-full h-auto object-contain pointer-events-none"
                                                style={{ maxHeight: "300px", minHeight: "150px" }}
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center">
                                                { `${ screenshot.zoom }x` }
                                            </div>
                                        </div>
                                    ) )}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    <div className="space-y-2">
                        <label
                            id={groupLabelId}
                            htmlFor={groupTriggerId}
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Group
                        </label>
                        <Select
                            value={selectedGroupId || SELECT_EMPTY_VALUE}
                            onValueChange={( value ) => {
                                onSelectedGroupIdChange( value === SELECT_EMPTY_VALUE ? "" : value );
                            }}
                            onOpenChange={handleSelectOpenChange}
                            disabled={isActionLocked}
                        >
                            <SelectTrigger
                                id={groupTriggerId}
                                aria-labelledby={groupLabelId}
                                className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background/80"
                                disabled={isActionLocked}
                            >
                                <SelectValue placeholder="Select a group" />
                            </SelectTrigger>
                            <SelectContent align="start" container={container ?? undefined}>
                                <SelectItem value={SELECT_EMPTY_VALUE}>
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full border border-border bg-transparent" />
                                        <span>No group</span>
                                    </div>
                                </SelectItem>
                                {selectOptions.map( ( option ) => (
                                    <SelectItem key={`${ note.id }-${ option.id }`} value={option.id}>
                                        <div className="flex items-center gap-2">
                                            <span
                                                aria-hidden="true"
                                                className="h-3 w-3 rounded-full border border-border"
                                                style={{ backgroundColor: resolveGroupColor( option.color ) }}
                                            />
                                            <span className="truncate">{option.name}</span>
                                        </div>
                                    </SelectItem>
                                ) )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                            Group Chat
                        </label>
                        {isChatEnabled ? (
                            <div className="space-y-2">
                                <div className="border border-border/60 rounded-md bg-background/40 h-48 overflow-y-auto p-2 flex flex-col gap-3">
                                    {chatHasMore ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="self-center text-xs"
                                            onClick={() => fetchOlderChatMessages( note.id )}
                                            disabled={chatLoading}
                                        >
                                            {chatLoading ? "Loading..." : "Load earlier"}
                                        </Button>
                                    ) : null}
                                    {chatMessages.length === 0 && !chatLoading ? (
                                        <p className="text-xs text-muted-foreground text-center mt-4">
                                            Start the conversation for this note.
                                        </p>
                                    ) : (
                                        chatMessages.map( ( message ) => {
                                            const isSelf = authUser?.id === message.userId;
                                            const bubbleClasses = cn(
                                                "rounded-lg px-3 py-2 text-xs whitespace-pre-wrap break-words",
                                                isSelf
                                                    ? "bg-primary/20 text-primary-foreground/90"
                                                    : "bg-muted text-foreground"
                                            );
                                            const timestamp = new Date( message.createdAt ).toLocaleTimeString(
                                                [],
                                                { hour: "2-digit", minute: "2-digit" }
                                            );
                                            return (
                                                <div key={message.id} className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                        <span className="font-medium">
                                                            {isSelf ? "You" : "Collaborator"}
                                                        </span>
                                                        <span>{timestamp}</span>
                                                        {message.optimistic ? (
                                                            <span>Sending…</span>
                                                        ) : null}
                                                    </div>
                                                    <div className={bubbleClasses}>
                                                        <p>{message.content}</p>
                                                    </div>
                                                </div>
                                            );
                                        } )
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={chatDraft}
                                        onChange={( event ) => setChatDraft( event.target.value )}
                                        placeholder="Type a message..."
                                        onKeyDown={( event ) => {
                                            if ( event.key === "Enter" && !event.shiftKey ) {
                                                event.preventDefault();
                                                void handleSendChat();
                                            }
                                        }}
                                        disabled={!authUser || !isChatEnabled || isSendingChat}
                                    />
                                    <Button onClick={() => void handleSendChat()} disabled={!canSendChat}>
                                        {isSendingChat ? "Sending..." : "Send"}
                                    </Button>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{chatStatusLabel}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Assign this note to a group to start chatting with collaborators.
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label
                            htmlFor={`note-content-${ note.id }`}
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Note
                        </label>
                        <textarea
                            id={`note-content-${ note.id }`}
                            className="w-full min-h-[150px] p-3 border border-border rounded resize-y font-sans bg-background/60 focus:bg-background/80 transition-colors"
                            value={draftContent}
                            onChange={( event ) => onDraftContentChange( event.target.value )}
                            placeholder="Enter your note..."
                            autoFocus
                            disabled={isActionLocked}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                        <Button variant="outline" onClick={onCancel} disabled={isActionLocked}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onDelete}
                            disabled={isDeleting || isExistingPending}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                        <Button onClick={onSave} disabled={isSaving || isExistingPending}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
