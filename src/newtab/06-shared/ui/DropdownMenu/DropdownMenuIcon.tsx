import React from "react";
import CopyIcon from "./img/copy.svg";
import BookmarkCopyIcon from "./img/bookmark-copy.svg";
import OrganizeIcon from "./img/organize.svg";
import BookmarkMoveToIcon from "./img/bookmark-move-to.svg";
import FolderMoveToIcon from "./img/folder-move-to.svg";
import RenameIcon from "./img/rename.svg";
import GroupRenameIcon from "./img/group-rename.svg";
import FolderRenameIcon from "./img/folder-rename.svg";
import DeleteIcon from "./img/delete.svg";
import BookmarkNewIcon from "./img/bookmark-new.svg";
import FolderNewIcon from "./img/folder-new.svg";
import GroupNewIcon from "./img/group-new.svg";
import GroupBookmarkOpenAllIcon from "./img/group-bookmark-open-all.svg";
import FolderOpenAllIcon from "./img/folder-open-all.svg";
import CollapseAllIcon from "./img/collapse-all.svg";
import ExpandAllIcon from "./img/expand-all.svg";
import HelpIcon from "./img/help.svg";

const icons = {
  copy: CopyIcon,
  bookmarkCopy: BookmarkCopyIcon,
  organize: OrganizeIcon,
  move: BookmarkMoveToIcon,
  folderMoveTo: FolderMoveToIcon,
  rename: RenameIcon,
  groupRename: GroupRenameIcon,
  folderRename: FolderRenameIcon,
  remove: DeleteIcon,
  newBookmark: BookmarkNewIcon,
  newFolder: FolderNewIcon,
  newGroup: GroupNewIcon,
  openAll: GroupBookmarkOpenAllIcon,
  folderOpenAll: FolderOpenAllIcon,
  collapseAll: CollapseAllIcon,
  expandAll: ExpandAllIcon,
  help: HelpIcon,
};

export type DropdownMenuIconName = keyof typeof icons;

export function DropdownMenuIcon({ name }: { name: DropdownMenuIconName }) {
  const Icon = icons[name];
  return <Icon className="dropdown-menu__icon" aria-hidden="true" focusable="false" />;
}
