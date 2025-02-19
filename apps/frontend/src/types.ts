export interface Note {
    id: number;
    elementPath: string;
    content: string;
    url: string;
    groupId: string;
    createdAt: number;
    createdBy: string;
    comments: Comment[];
    x?: number;
    y?: number;
    isEditing?: boolean;
    highlightedElement?: Element | null;
}

export interface Comment {
    id: number;
    content: string;
    createdAt: number;
    createdBy: string;
}
