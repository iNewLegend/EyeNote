export interface Vector2D {
    x : number;
    y : number;
}

export type ViewportPosition = Vector2D;

export interface SerializedDOMRect {
    top : number;
    right : number;
    bottom : number;
    left : number;
    width : number;
    height : number;
}

export interface ElementLocationSnapshot {
    elementPath : string;
    tagName : string;
    rect : SerializedDOMRect;
    viewportPosition : ViewportPosition;
    elementOffset : Vector2D;
    elementOffsetRatio : Vector2D;
    scrollPosition : Vector2D;
    timestamp : number;
}

export interface NoteLocationMetadata {
    x ?: number;
    y ?: number;
    elementRect ?: SerializedDOMRect;
    elementOffset ?: Vector2D;
    elementOffsetRatio ?: Vector2D;
    scrollPosition ?: Vector2D;
    locationCapturedAt ?: number;
}

export interface NoteBase extends NoteLocationMetadata {
    elementPath : string;
    content : string;
    url : string;
    groupId ?: string | null;
}

export interface NoteRecord extends NoteBase {
    id : string;
    createdAt : string;
    updatedAt : string;
}

export type CreateNotePayload = NoteBase;

export type UpdateNotePayload = Partial<NoteBase>;

export interface GroupBase {
    name : string;
    description ?: string;
}

export interface GroupRecord extends GroupBase {
    id : string;
    slug : string;
    ownerId : string;
    inviteCode : string;
    memberCount : number;
    createdAt : string;
    updatedAt : string;
}

export type CreateGroupPayload = GroupBase;

export interface JoinGroupPayload {
    inviteCode : string;
}

export interface ListGroupsResponse {
    groups : GroupRecord[];
}

export interface AuthUser {
    id : string;
    email ?: string;
    name ?: string;
    picture ?: string | null;
}

export interface AuthSession {
    authToken : string;
    authAccessToken : string;
    authTokenExpiresAt : number;
    user : AuthUser;
}

export interface ListNotesQuery {
    url ?: string;
    groupIds ?: string[];
}

export interface HealthResponse {
    status : string;
    timestamp : string;
}
