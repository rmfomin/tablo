import type { BookmarkItemV3, SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { collectBookmarksV3 } from "@/newtab/05-entities/dashboard/model/traversal";
import type { RecentItem } from "@/newtab/06-shared/api/chrome/history";

export function isFolderItemNotUsed(
  item: BookmarkItemV3,
  historyItems: RecentItem[],
): boolean {
  if (item.isSection) return false;

  return !historyItems.some((historyItem) => historyItem.url === item.url);
}

export function hasItemsToHighlight(
  spaces: SpaceV3[],
  recentItems: RecentItem[],
): boolean {
  return collectBookmarksV3(spaces).some((item) =>
    isFolderItemNotUsed(item, recentItems),
  );
}
