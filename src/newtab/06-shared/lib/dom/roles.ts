export const DOM_ROLE = {
  bookmarks: "bookmarks",
  areaSelectionFrame: "area-selection-frame",
  spacesList: "spaces-list",
  spaceItem: "space-item",
  spaceDelete: "space-delete",
  folder: "folder",
  folderItems: "folder-items",
  folderItem: "folder-item",
  folderItemMenu: "folder-item-menu",
  folderGroup: "folder-group",
  groupHeader: "group-header",
  groupItems: "group-items",
  sidebar: "sidebar",
  alreadySaved: "already-saved",
} as const;

export function roleSelector(role: typeof DOM_ROLE[keyof typeof DOM_ROLE]) {
  return `[data-role="${role}"]`;
}

