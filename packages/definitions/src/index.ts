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
    hostname ?: string | null;
    groupId ?: string | null;
    pageId ?: string | null;
    canonicalUrl ?: string | null;
    normalizedUrl ?: string | null;
    anchorHints ?: AnchorHints;
}

export interface NoteRecord extends NoteBase {
    id : string;
    createdAt : string;
    updatedAt : string;
}

export type CreateNotePayload = NoteBase & {
    pageIdentity ?: PageIdentityPayload;
};

export type UpdateNotePayload = Partial<NoteBase> & {
    pageIdentity ?: PageIdentityPayload;
};

export interface AnchorHints {
    tagName ?: string;
    id ?: string;
    classListSample ?: string[];
    dataAttrs ?: Record<string, string>;
    textHash ?: string;
}

export interface GroupBase {
    name : string;
    description ?: string;
    color ?: string;
}

export interface GroupRecord extends GroupBase {
    id : string;
    slug : string;
    ownerId : string;
    inviteCode : string;
    memberCount : number;
    createdAt : string;
    updatedAt : string;
    color : string;
}

export type CreateGroupPayload = GroupBase;

export type UpdateGroupPayload = Partial<GroupBase>;

export interface JoinGroupPayload {
    inviteCode : string;
}

export interface ListGroupsResponse {
    groups : GroupRecord[];
}

export interface ListNotesQuery {
    url ?: string;
    hostname ?: string;
    groupIds ?: string[];
    pageId ?: string;
    normalizedUrl ?: string;
    pageIdentity ?: PageIdentityPayload;
}

export interface HealthResponse {
    status : string;
    timestamp : string;
}

export enum GroupPermission {
    MANAGE_GROUP = "manage_group",
    MANAGE_ROLES = "manage_roles",
    MANAGE_MEMBERS = "manage_members",
    MODERATE_CONTENT = "moderate_content",
    CREATE_NOTES = "create_notes",
    EDIT_NOTES = "edit_notes",
    DELETE_NOTES = "delete_notes",
    VIEW_NOTES = "view_notes",
}

export interface GroupRoleBase {
    name : string;
    description ?: string;
    color ?: string;
    permissions : GroupPermission[];
    position : number;
}

export interface GroupRoleRecord extends GroupRoleBase {
    id : string;
    groupId : string;
    isDefault : boolean;
    createdAt : string;
    updatedAt : string;
}

export type CreateGroupRolePayload = Omit<GroupRoleBase, "position">;

export type UpdateGroupRolePayload = Partial<Omit<GroupRoleBase, "position">>;

export interface GroupMemberRole {
    userId : string;
    roleId : string;
    assignedAt : string;
    assignedBy : string;
}

export interface GroupWithRoles extends GroupRecord {
    roles : GroupRoleRecord[];
    memberRoles : GroupMemberRole[];
}

export interface AssignRolePayload {
    userId : string;
    roleId : string;
}

export interface RemoveRolePayload {
    userId : string;
    roleId : string;
}

export interface PageIdentityPayload {
    canonicalUrl ?: string;
    normalizedUrl : string;
    sourceUrl ?: string;
    contentSignature : string;
    layoutSignature : string;
    layoutTokens : string[];
    textTokenSample : number;
    generatedAt : string;
}

export interface PageIdentityResolution {
    pageId : string;
    matched : boolean;
    confidence : number;
    canonicalMatch : boolean;
    reasons : string[];
}

export interface ListNotesResponse {
    notes : NoteRecord[];
    identity ?: PageIdentityResolution;
}

export * from "./constants";
