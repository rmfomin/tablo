import type {
  BookmarkItemV3,
  FolderItemToCreate,
  FolderV3,
  ItemToCreateV3,
  SpaceV3,
} from "@/newtab/helpers/types";

export type DashboardState = {
  spaces: SpaceV3[];
  currentSpaceId: number;
};

export type FolderPatch = Pick<
  Partial<FolderV3>,
  "title" | "color" | "archived" | "collapsed" | "twoColumn" | "position"
>;

export type MoveFolderInput = {
  folderId: number;
  targetSpaceId: number;
  insertBeforeFolderId?: number;
};

export type MoveSpaceInput = {
  spaceId: number;
  insertBeforeSpaceId?: number;
};

export type CreateSpaceInput = { id: number; title: string; position?: string };

export type CreateFolderInput = {
  id?: number;
  spaceId?: number;
  title?: string;
  color?: string;
  position?: string;
  items?: FolderItemToCreate[];
};

export type CreateFolderItemInput = {
  folderId: number;
  targetGroupId?: number;
  insertBeforeItemId?: number;
  item: ItemToCreateV3;
};

export type CreateFolderItemsInput = {
  folderId: number;
  items: ItemToCreateV3[];
  targetGroupId?: number;
  insertBeforeItemId?: number;
};

export type MoveFolderItemsInput = {
  itemIds: number[];
  targetFolderId: number;
  targetGroupId?: number;
  insertBeforeItemId?: number;
};

export type SpacePatch = Pick<
  Partial<SpaceV3>,
  "title" | "position" | "folders"
>;

export type FolderItemPatch = Pick<
  Partial<BookmarkItemV3>,
  "title" | "archived" | "url" | "favIconUrl"
> & { collapsed?: boolean };
