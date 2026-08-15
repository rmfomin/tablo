import type { BookmarkItemV3, SpaceV3 } from "./types";

export function collectBookmarksV3(spaces: SpaceV3[]): BookmarkItemV3[] {
  return spaces.flatMap((space) =>
    space.folders.flatMap((folder) =>
      folder.items.flatMap((item) => {
        if (item.type === "bookmark") {
          return [item];
        }

        return item.groupItems;
      }),
    ),
  );
}

export function hasArchivedItemsV3(spaces: SpaceV3[]): boolean {
  return spaces.some((space) =>
    space.folders.some((folder) => {
      if (folder.archived) {
        return true;
      }

      return folder.items.some((item) => {
        if (item.archived) {
          return true;
        }

        if (item.type === "bookmark") {
          return !!item.archived;
        }

        return item.groupItems.some((groupItem) => !!groupItem.archived);
      });
    }),
  );
}
