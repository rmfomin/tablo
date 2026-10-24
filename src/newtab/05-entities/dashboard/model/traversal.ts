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
