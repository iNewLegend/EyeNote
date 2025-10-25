export interface ChromeStorageCallback<T> {
    ( result : { [key : string] : T } ) : void;
}

export interface ChromeMessage {
    type : string;
    [key : string] : unknown;
}

export interface ChromeResponse {
    isAuthenticated ?: boolean;
    user ?: {
        id : string;
        email : string;
        name : string;
        picture : string | null;
    };
    success ?: boolean;
    error ?: string;
}

export interface MockChromeAPI {
    storage : {
        local : {
            get : <T>( key : string, callback : ChromeStorageCallback<T> ) => void;
            set : ( items : object ) => void;
        };
    };
    runtime : {
        sendMessage : (
            message : ChromeMessage,
            callback ?: ( response : ChromeResponse ) => void
        ) => Promise<ChromeResponse>;
    };
}
