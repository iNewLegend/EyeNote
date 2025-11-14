import {
    configureGroupsApiClient,
    configureGroupsStorageAdapter,
} from "@eye-note/groups";

import { groupsApiClient } from "./groups-api";
import { chromeGroupsStorageAdapter } from "./groups-storage";

configureGroupsApiClient( groupsApiClient );
configureGroupsStorageAdapter( chromeGroupsStorageAdapter );

export * from "@eye-note/groups";
export * from "./groups-api";
