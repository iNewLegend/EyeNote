export interface GroupsStorageAdapter {
    getActiveGroupIds : () => Promise<string[]>;
    setActiveGroupIds : ( ids : string[] ) => Promise<void>;
    subscribeToActiveGroupIds ?: ( callback : ( ids : string[] ) => void ) => () => void;
}

const noop : GroupsStorageAdapter = {
    async getActiveGroupIds () {
        return [];
    },
    async setActiveGroupIds () {
        // noop
    },
    subscribeToActiveGroupIds : () => () => {},
};

let storageAdapter : GroupsStorageAdapter = noop;

export function configureGroupsStorageAdapter ( adapter : GroupsStorageAdapter ) {
    storageAdapter = {
        ...noop,
        ...adapter,
    };
}

export function getGroupsStorageAdapter () : GroupsStorageAdapter {
    return storageAdapter;
}
