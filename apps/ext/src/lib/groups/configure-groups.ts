import {
    configureGroupsApiClient,
    configureGroupsStorageAdapter,
} from "@eye-note/groups";

import { groupsApiClient } from "./groups-api-client";
import { chromeGroupsStorageAdapter } from "./chrome-groups-storage";

let isConfigured = false;

export function ensureGroupsConfigured () {
    if ( isConfigured ) {
        return;
    }

    configureGroupsApiClient( groupsApiClient );
    configureGroupsStorageAdapter( chromeGroupsStorageAdapter );
    isConfigured = true;
}
