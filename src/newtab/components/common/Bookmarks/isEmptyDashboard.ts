import { SpaceV3 } from "@/newtab/helpers/types";
import { hasSearch, SearchFilter } from "@/newtab/helpers/utils";

export type EmptyDashboardInput = {
  spaces: SpaceV3[];
  currentSpaceId: number;
  search: string;
  searchFilters?: SearchFilter[];
};

export function isEmptyDashboard(
  appState: EmptyDashboardInput,
): boolean {
  if (hasSearch(appState.search, appState.searchFilters ?? [])) {
    return false;
  }

  const currentSpace = appState.spaces.find(
    (space) => space.id === appState.currentSpaceId,
  );
  if (!currentSpace) {
    return true;
  }

  return currentSpace.folders.length === 0;
}
