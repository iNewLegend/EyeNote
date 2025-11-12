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
    scrollPosition : Vector2D;
    timestamp : number;
}

export interface NoteLocationMetadata {
    elementRect ?: SerializedDOMRect;
    elementOffset ?: Vector2D;
    scrollPosition ?: Vector2D;
    locationCapturedAt ?: number;
}

export interface ElementScreenshot {
    dataUrl : string;
    width : number;
    height : number;
    zoom : number;
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
    screenshots ?: ElementScreenshot[];
}

export interface NoteRecord extends NoteBase {
    id : string;
    createdAt : string;
    updatedAt : string;
}

export interface NoteChatMessageBase {
    noteId : string;
    groupId : string | null;
    userId : string;
    content : string;
    clientMessageId ?: string;
}

export interface NoteChatMessageRecord extends NoteChatMessageBase {
    id : string;
    createdAt : string;
    updatedAt : string;
}

export interface CreateNoteChatMessagePayload {
    content : string;
    clientMessageId ?: string;
}

export interface ListNoteChatMessagesResponse {
    messages : NoteChatMessageRecord[];
    nextCursor ?: string;
    hasMore : boolean;
}

export type NotificationType = "note_chat_message" | "group_join_request" | "group_join_decision";

export interface NotificationMetadata {
    noteId ?: string;
    groupId ?: string;
    messageId ?: string;
    senderId ?: string;
    snippet ?: string;
    requestId ?: string;
    requesterId ?: string;
    requesterName ?: string;
    decision ?: "approved" | "rejected";
    processedBy ?: string;
}

export interface NotificationRecord {
    id : string;
    userId : string;
    type : NotificationType;
    title : string;
    body ?: string | null;
    data ?: NotificationMetadata;
    isRead : boolean;
    readAt ?: string | null;
    createdAt : string;
    updatedAt : string;
}

export interface ListNotificationsResponse {
    notifications : NotificationRecord[];
    nextCursor ?: string;
    hasMore : boolean;
    unreadCount : number;
}

export interface MarkNotificationsReadPayload {
    notificationIds : string[];
}

export interface RealtimeTokenRequestPayload {
    activeGroupIds ?: string[];
}

export interface RealtimeTokenResponse {
    token : string;
    expiresAt : string;
}

export interface RealtimeAuthClaims {
    userId : string;
    groupIds : string[];
    iat : number;
    exp : number;
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

export type GroupJoinRequestStatus = "pending" | "approved" | "rejected";

export interface GroupJoinRequestRecord {
    id : string;
    groupId : string;
    groupName : string;
    userId : string;
    userName ?: string;
    inviteCode : string;
    status : GroupJoinRequestStatus;
    processedBy ?: string | null;
    processedAt ?: string | null;
    createdAt : string;
    updatedAt : string;
}

export interface JoinGroupResponse {
    group : GroupRecord;
    joined : boolean;
    requiresApproval : boolean;
    request ?: GroupJoinRequestRecord;
}

export interface GroupInviteRecord {
    id : string;
    groupId : string;
    email : string;
    code : string;
    status : "pending" | "used";
    expiresAt ?: string | null;
    usedAt ?: string | null;
    usedBy ?: string | null;
    createdAt : string;
    updatedAt : string;
}

export interface CreateGroupInvitePayload {
    email : string;
    expiresInHours ?: number;
}

export interface ListGroupsResponse {
    groups : GroupRecord[];
}

export interface ReviewJoinRequestResponse {
    request : GroupJoinRequestRecord;
    group : GroupRecord;
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
