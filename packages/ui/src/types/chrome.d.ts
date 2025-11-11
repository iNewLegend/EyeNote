declare global {
    const chrome : {
        runtime ?: {
            getURL ?: ( path : string ) => string;
        };
    } | undefined;
}

export {};

