import { useStore } from "zustand";
import { createStore, type StateCreator, type StoreApi } from "zustand/vanilla";
import {
  createFolder,
  createFolderItem,
  createFolderItems,
  createSpace,
  deleteFolder,
  deleteFolderGroup,
  deleteFolderItems,
  deleteSpace,
  moveFolder,
  moveFolderItems,
  moveSpace,
  selectSpace,
  updateFolder,
  updateFolderItem,
  updateSpace,
} from "@/newtab/01-app/model/dashboard/domain";
import type {
  DashboardState,
  CreateFolderInput,
  CreateFolderItemInput,
  CreateFolderItemsInput,
  CreateSpaceInput,
  FolderItemPatch,
  FolderPatch,
  MoveFolderInput,
  MoveFolderItemsInput,
  MoveSpaceInput,
  SpacePatch,
} from "@/newtab/01-app/model/dashboard/types";

export type DashboardUndoStep = Pick<DashboardState, "spaces" | "currentSpaceId">;

export type DashboardActions = {
  createSpace(input: CreateSpaceInput): void;
  updateSpace(spaceId: number, patch: SpacePatch): void;
  moveSpace(input: MoveSpaceInput): void;
  deleteSpace(spaceId: number): void;
  createFolder(input: CreateFolderInput): void;
  createFolderItem(input: CreateFolderItemInput): void;
  createFolderItems(input: CreateFolderItemsInput): void;
  deleteFolder(folderId: number): void;
  deleteFolderGroup(groupId: number): void;
  deleteFolderItems(itemIds: number[]): void;
  updateFolderItem(itemId: number, patch: FolderItemPatch): void;
  selectSpace(spaceId: number): void;
  updateFolder(folderId: number, patch: FolderPatch): void;
  moveFolder(input: MoveFolderInput): void;
  moveFolderItems(input: MoveFolderItemsInput): void;
  undo(): void;
  hydrate(state: DashboardState): void;
};

export type DashboardStore = DashboardState & DashboardActions & {
  /** Undo — состояние текущей вкладки, поэтому его нельзя сохранять в Chrome storage. */
  undoSteps: DashboardUndoStep[];
};

const emptyDashboardState: DashboardState = {
  spaces: [],
  currentSpaceId: -1,
};

const maxUndoSteps = 50;

// Данные и команды
function createDashboardSlice(
  initialState: DashboardState,
): StateCreator<DashboardStore> {
  return (set) => ({
    ...initialState,

    undoSteps: [],

    createSpace: (input) => set((state) => applyWithUndo(state, createSpace(state, input))),
    updateSpace: (spaceId, patch) => set((state) => applyWithUndo(state, updateSpace(state, spaceId, patch))),
    moveSpace: (input) => set((state) => applyWithUndo(state, moveSpace(state, input))),
    deleteSpace: (spaceId) => set((state) => applyWithUndo(state, deleteSpace(state, spaceId))),
    createFolder: (input) => set((state) => applyWithUndo(state, createFolder(state, input))),
    createFolderItem: (input) => set((state) => applyWithUndo(state, createFolderItem(state, input))),
    createFolderItems: (input) => set((state) => applyWithUndo(state, createFolderItems(state, input))),
    deleteFolder: (folderId) => set((state) => applyWithUndo(state, deleteFolder(state, folderId))),
    deleteFolderGroup: (groupId) => set((state) => applyWithUndo(state, deleteFolderGroup(state, groupId))),
    deleteFolderItems: (itemIds) => set((state) => applyWithUndo(state, deleteFolderItems(state, itemIds))),
    updateFolderItem: (itemId, patch) => set((state) => applyWithUndo(state, updateFolderItem(state, itemId, patch))),
    selectSpace: (spaceId) => {
      set((state) => selectSpace(state, spaceId));
    },
    updateFolder: (folderId, patch) => {
      set((state) => applyWithUndo(state, updateFolder(state, folderId, patch)));
    },
    moveFolder: (input) => {
      set((state) => applyWithUndo(state, moveFolder(state, input)));
    },
    moveFolderItems: (input) => set((state) => applyWithUndo(state, moveFolderItems(state, input))),
    undo: () => set((state) => {
      const previous = state.undoSteps.at(-1);
      return previous
        ? { ...previous, undoSteps: state.undoSteps.slice(0, -1) }
        : state;
    }),

    // Zustand по умолчанию merge-ит объект. Благодаря этому hydration заменяет
    // только данные из storage и не стирает functions-actions store.
    hydrate: (state) => {
      set({ ...state, undoSteps: [] });
    },
  });
}

// createStore — это Zustand vanilla, который не привязан к React. 
// В vanilla store нет React-хуков, их добавит useStore
export function createDashboardStore(
  initialState: DashboardState = emptyDashboardState,
): StoreApi<DashboardStore> {
  return createStore<DashboardStore>()(createDashboardSlice(initialState));
}

function applyWithUndo(state: DashboardStore, nextState: DashboardState): Partial<DashboardStore> {
  if (nextState === state) return state;

  return {
    ...nextState,
    undoSteps: [
      ...state.undoSteps,
      { spaces: state.spaces, currentSpaceId: state.currentSpaceId },
    ].slice(-maxUndoSteps),
  };
}

export const dashboardStore = createDashboardStore();

// React-хук для использования dashboardStore в компонентах React
export function useDashboardStore<T>(
  selector: (state: DashboardStore) => T,
): T {
  return useStore(dashboardStore, selector);
}
