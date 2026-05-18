// ─── Visual Editor Pro — Core types ──────────────────────────────────────────

export interface SectionBlock {
  id: string;
  blockType: string;
  sortOrder: number;
  isVisible: boolean;
  settings: Record<string, unknown>;
  source: string;
  state: string;
}

export interface NavigationItem {
  id: string;
  group: string;
  label: string;
  href: string;
  sortOrder: number;
  isVisible: boolean;
}

export type EditorPage = "home" | "listing" | "product" | "cart";

export type DeviceMode = "desktop" | "tablet" | "mobile";

export type PublishStatus = "draft" | "published" | "modified" | "unsaved";

export type InspectorTab = "content" | "design" | "layout" | "effects" | "advanced";

export interface EditorSelection {
  sectionId: string | null;
  sectionType: string | null;
}

export interface EditorState {
  blocks: SectionBlock[];
  navigation: NavigationItem[];
  selectedSection: EditorSelection;
  activePage: EditorPage;
  deviceMode: DeviceMode;
  inspectorTab: InspectorTab;
  publishStatus: PublishStatus;
  isDirty: boolean;
  structurePanelOpen: boolean;
  inspectorPanelOpen: boolean;
}

export type EditorAction =
  | { type: "SET_BLOCKS"; blocks: SectionBlock[] }
  | { type: "UPDATE_BLOCK_SETTINGS"; blockId: string; settings: Record<string, unknown> }
  | { type: "TOGGLE_BLOCK_VISIBILITY"; blockId: string }
  | { type: "MOVE_BLOCK"; blockId: string; direction: "up" | "down" }
  | { type: "DUPLICATE_BLOCK"; blockId: string }
  | { type: "REMOVE_BLOCK"; blockId: string }
  | { type: "ADD_BLOCK"; blockType: string; settings: Record<string, unknown> }
  | { type: "SET_NAVIGATION"; navigation: NavigationItem[] }
  | { type: "SELECT_SECTION"; selection: EditorSelection }
  | { type: "SET_PAGE"; page: EditorPage }
  | { type: "SET_DEVICE"; device: DeviceMode }
  | { type: "SET_INSPECTOR_TAB"; tab: InspectorTab }
  | { type: "SET_PUBLISH_STATUS"; status: PublishStatus }
  | { type: "MARK_CLEAN" }
  | { type: "TOGGLE_STRUCTURE_PANEL" }
  | { type: "TOGGLE_INSPECTOR_PANEL" }
  | { type: "RESTORE_SNAPSHOT"; snapshot: EditorSnapshot };

export interface EditorSnapshot {
  blocks: SectionBlock[];
  navigation: NavigationItem[];
}
