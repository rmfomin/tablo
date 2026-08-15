import type { FolderV3, SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import type { DashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";

export const spacesSelector = (state: DashboardStore): SpaceV3[] => state.spaces;

export const currentSpaceSelector = (
  state: DashboardStore,
): SpaceV3 | undefined =>
  state.spaces.find((space) => space.id === state.currentSpaceId);

export const currentFoldersSelector = (state: DashboardStore): FolderV3[] =>
  currentSpaceSelector(state)?.folders ?? [];

export const folderByIdSelector = (folderId: number) => (
  state: DashboardStore,
): FolderV3 | undefined =>
  state.spaces
    .flatMap((space) => space.folders)
    .find((folder) => folder.id === folderId);
