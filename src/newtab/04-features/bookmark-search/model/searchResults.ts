import {
  isContainsSearch,
  type SearchFilter,
  type SearchFilterMode,
} from "./filters";
import type {
  BookmarkItemV3,
  FolderV3,
  GroupV3,
  SpaceV3,
} from "@/newtab/05-entities/dashboard/model/types";

export type SpaceSearchResult = {
  id: string;
  title: string;
  url: string;
  favIconUrl: string;
  folderTitle: string;
  groupTitle?: string;
};

export type SpaceSearchResultGroup = {
  id: number;
  title: string;
  results: SpaceSearchResult[];
};

export function getSpaceSearchResultGroups(
  spaces: SpaceV3[],
  search: string,
  filters: SearchFilter[],
  filterMode: SearchFilterMode,
): SpaceSearchResultGroup[] {
  return spaces.flatMap((space) => {
    const results: SpaceSearchResult[] = [];
    const spaceMatched = matches(space, search, filters, filterMode);
    space.folders.forEach((folder) => {
      const folderMatched =
        spaceMatched || matches(folder, search, filters, filterMode);

      folder.items.forEach((item) => {
        if (item.type === "bookmark") {
          if (folderMatched || matches(item, search, filters, filterMode)) {
            addResult(results, space, folder, item);
          }
          return;
        }

        const groupMatched =
          folderMatched || matches(item, search, filters, filterMode);
        item.groupItems.forEach((groupItem) => {
          if (groupMatched || matches(groupItem, search, filters, filterMode)) {
            addResult(results, space, folder, groupItem, item);
          }
        });
      });
    });
    return results.length > 0
      ? [{ id: space.id, title: space.title, results }]
      : [];
  });
}

function matches(
  item: Pick<BookmarkItemV3 | FolderV3 | GroupV3 | SpaceV3, "title"> & {
    url?: string;
  },
  search: string,
  filters: SearchFilter[],
  filterMode: SearchFilterMode,
): boolean {
  return isContainsSearch(item, search, filters, filterMode);
}

function addResult(
  results: SpaceSearchResult[],
  space: SpaceV3,
  folder: FolderV3,
  item: BookmarkItemV3,
  group?: GroupV3,
): void {
  if (item.isSection || !item.url) {
    return;
  }

  results.push({
    id: `${space.id}-${folder.id}-${group?.id ?? "folder"}-${item.id}`,
    title: item.title,
    url: item.url,
    favIconUrl: item.favIconUrl,
    folderTitle: folder.title,
    groupTitle: group?.title,
  });
}
