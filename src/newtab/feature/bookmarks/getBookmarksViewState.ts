import {
  hasSearch,
  isContainsSearch,
  SearchFilter,
  SearchFilterMode,
} from "@/newtab/helpers/utils";
import { SpaceV3, FolderV3 } from "@/newtab/helpers/types";

export type BookmarksViewStateInput = {
  spaces: SpaceV3[];
  currentSpaceId: number;
  search: string;
  searchFilters?: SearchFilter[];
  searchFilterMode?: SearchFilterMode;
  showArchived: boolean;
};

export function getBookmarksViewState(
  appState: BookmarksViewStateInput,
): {
  folders: FolderV3[];
} {
  const searchFilters = appState.searchFilters ?? [];
  const searchFilterMode: SearchFilterMode = appState.searchFilterMode ?? "or";
  const searchActive = hasSearch(appState.search, searchFilters);
  const canShowArchived = appState.showArchived || searchActive;
  let folders: FolderV3[] = [];

  if (!searchActive) {
    const currentSpace = appState.spaces.find(
      (space) => space.id === appState.currentSpaceId,
    );

    if (currentSpace) {
      folders = appState.showArchived
        ? currentSpace.folders ?? []
        : currentSpace.folders.filter(
            (folder) => canShowArchived || !folder.archived,
          );
    }
  } else {
    const searchValueLC = appState.search.toLowerCase();
    appState.spaces.forEach((space) => {
      space.folders.forEach((folder) => {
        if (
          isContainsSearch(
            folder,
            searchValueLC,
            searchFilters,
            searchFilterMode,
          ) ||
          folder.items.some((item) => {
            if (
              isContainsSearch(
                item,
                searchValueLC,
                searchFilters,
                searchFilterMode,
              )
            ) {
              return true;
            }

            if (item.type === "group") {
              return item.groupItems.some((groupItem) =>
                isContainsSearch(
                  groupItem,
                  searchValueLC,
                  searchFilters,
                  searchFilterMode,
                ),
              );
            }

            return false;
          })
        ) {
          folders.push(folder);
        }
      });
    });
  }

  return { folders };
}
