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
    groupId ?: string;
}

export interface HealthResponse {
    status : string;
    timestamp : string;
}
