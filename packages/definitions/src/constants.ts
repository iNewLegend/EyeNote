// Global constants shared across workspaces (SCREAMING_CASE)

// DOM containers and selectors
export const EYE_NOTE_ROOT_CONTAINER_ID = "eye-note-root-container";
export const EYE_NOTE_SHADOW_CONTAINER_ID = "eye-note-shadow-dom";
export const EYE_NOTE_USERLAND_CONTAINER_ID = "eye-note-userland-dom";
export const NOTES_PLUGIN_SELECTOR = ".notes-plugin";

// Mutation observer tuning
export const MUTATION_DEBOUNCE_MS_DEFAULT = 800;
export const MUTATION_MAX_ROOT_SAMPLES_DEFAULT = 24;
export const MUTATION_ATTRIBUTE_FILTER = [ "class", "style", "hidden" ] as const;

// Marker rendering/virtualization
export const MARKER_IO_ROOT_MARGIN = "200px";
export const MARKER_IO_THRESHOLD = 0;
export const MARKER_ELEMENT_ID_DATA_ATTR = "data-eye-note-element-id";

// Anchor hints
export const ANCHOR_HINTS_DATA_ATTR_WHITELIST = [
  "data-testid",
  "data-test",
  "data-qa",
  "data-cy",
] as const;

// Custom event names
export const EVENT_OPEN_GROUP_MANAGER = "eye-note-open-group-manager";
export const EVENT_OPEN_QUICK_MENU = "eye-note-open-quick-menu";
export const EVENT_OPEN_SETTINGS_DIALOG = "eye-note-open-settings-dialog";
export const EVENT_OPEN_NOTIFICATIONS_PANEL = "eye-note-open-notifications-panel";

// Copy shared between app + extension
export const EXTENSION_MANAGEMENT_TITLE = "Extension Managment";
export const EXTENSION_MANAGEMENT_DESCRIPTION = "Manage overlay behavior and collaboration options from the extension managment panel without launching the extension.";
