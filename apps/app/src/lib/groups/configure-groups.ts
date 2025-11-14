import {
    configureGroupsApiClient,
    configureGroupsStorageAdapter,
} from "@eye-note/groups";

import { groupsApiClient } from "./groups-api-client";
import { localGroupsStorageAdapter } from "./local-groups-storage";

let configured = false;

export function ensureGroupsConfigured () {
    if ( configured ) {
        return;
    }

    configureGroupsApiClient( groupsApiClient );
    configureGroupsStorageAdapter( localGroupsStorageAdapter );
    configured = true;
}
