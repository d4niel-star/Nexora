// ─── Visual Editor Pro — State Reducer ───────────────────────────────────────

import type { EditorState, EditorAction, SectionBlock } from "./types";

export const INITIAL_EDITOR_STATE: EditorState = {
  blocks: [],
  navigation: [],
  selectedSection: { sectionId: null, sectionType: null },
  activePage: "home",
  deviceMode: "desktop",
  inspectorTab: "content",
  publishStatus: "published",
  isDirty: false,
  structurePanelOpen: true,
  inspectorPanelOpen: true,
};

function createDraftId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_BLOCKS":
      return { ...state, blocks: action.blocks };

    case "UPDATE_BLOCK_SETTINGS": {
      return {
        ...state,
        isDirty: true,
        publishStatus: "unsaved",
        blocks: state.blocks.map((b) =>
          b.id === action.blockId ? { ...b, settings: action.settings } : b,
        ),
      };
    }

    case "TOGGLE_BLOCK_VISIBILITY": {
      return {
        ...state,
        isDirty: true,
        publishStatus: "unsaved",
        blocks: state.blocks.map((b) =>
          b.id === action.blockId ? { ...b, isVisible: !b.isVisible } : b,
        ),
      };
    }

    case "MOVE_BLOCK": {
      const sorted = [...state.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((b) => b.id === action.blockId);
      const swapIdx = action.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return state;

      const reordered = sorted.map((b, i) => {
        if (i === idx) return { ...b, sortOrder: sorted[swapIdx].sortOrder };
        if (i === swapIdx) return { ...b, sortOrder: sorted[idx].sortOrder };
        return b;
      });
      return { ...state, isDirty: true, publishStatus: "unsaved", blocks: reordered };
    }

    case "DUPLICATE_BLOCK": {
      const source = state.blocks.find((b) => b.id === action.blockId);
      if (!source) return state;
      const maxSort = Math.max(...state.blocks.map((b) => b.sortOrder), 0);
      const clone: SectionBlock = {
        ...source,
        id: createDraftId(),
        sortOrder: maxSort + 1,
        settings: { ...source.settings },
        source: "manual",
        state: "draft",
      };
      return {
        ...state,
        isDirty: true,
        publishStatus: "unsaved",
        blocks: [...state.blocks, clone],
      };
    }

    case "REMOVE_BLOCK":
      return {
        ...state,
        isDirty: true,
        publishStatus: "unsaved",
        blocks: state.blocks.filter((b) => b.id !== action.blockId),
        selectedSection:
          state.selectedSection.sectionId === action.blockId
            ? { sectionId: null, sectionType: null }
            : state.selectedSection,
      };

    case "ADD_BLOCK": {
      const maxSort = Math.max(...state.blocks.map((b) => b.sortOrder), 0);
      const newBlock: SectionBlock = {
        id: createDraftId(),
        blockType: action.blockType,
        sortOrder: maxSort + 1,
        isVisible: true,
        settings: action.settings,
        source: "manual",
        state: "draft",
      };
      return {
        ...state,
        isDirty: true,
        publishStatus: "unsaved",
        blocks: [...state.blocks, newBlock],
        selectedSection: { sectionId: newBlock.id, sectionType: newBlock.blockType },
      };
    }

    case "SET_NAVIGATION":
      return { ...state, navigation: action.navigation, isDirty: true, publishStatus: "unsaved" };

    case "SELECT_SECTION":
      return { ...state, selectedSection: action.selection, inspectorTab: "content" };

    case "SET_PAGE":
      return { ...state, activePage: action.page, selectedSection: { sectionId: null, sectionType: null } };

    case "SET_DEVICE":
      return { ...state, deviceMode: action.device };

    case "SET_INSPECTOR_TAB":
      return { ...state, inspectorTab: action.tab };

    case "SET_PUBLISH_STATUS":
      return { ...state, publishStatus: action.status };

    case "MARK_CLEAN":
      return { ...state, isDirty: false, publishStatus: "published" };

    case "TOGGLE_STRUCTURE_PANEL":
      return { ...state, structurePanelOpen: !state.structurePanelOpen };

    case "TOGGLE_INSPECTOR_PANEL":
      return { ...state, inspectorPanelOpen: !state.inspectorPanelOpen };

    case "RESTORE_SNAPSHOT":
      return {
        ...state,
        blocks: action.snapshot.blocks,
        navigation: action.snapshot.navigation,
        isDirty: true,
        publishStatus: "unsaved",
      };

    default:
      return state;
  }
}
