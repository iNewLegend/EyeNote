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

export type AuthProvider = {
    signIn : () => Promise<AuthUser>;
    signOut : () => Promise<void>;
    getCurrentUser : () => Promise<AuthUser | null>;
};
