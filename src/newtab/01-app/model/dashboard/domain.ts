import {
  insertBetween,
  sortByPosition,
} from "@/newtab/05-entities/dashboard/model/fractionalIndexes";
import type {
  BookmarkItemV3,
  FolderItemToCreate,
  FolderV3,
  GroupV3,
  ItemToCreateV3,
  ItemV3,
  SpaceV3,
} from "@/newtab/05-entities/dashboard/model/types";
import type {
  CreateFolderInput,
  CreateFolderItemInput,
  CreateFolderItemsInput,
  CreateSpaceInput,
  DashboardState,
  FolderItemPatch,
  FolderPatch,
  MoveFolderInput,
  MoveFolderItemsInput,
  MoveSpaceInput,
  SpacePatch,
} from "@/newtab/01-app/model/dashboard/types";

export function selectSpace(
  state: DashboardState,
  spaceId: number,
): DashboardState {
  const currentSpaceId = state.spaces.some((space) => space.id === spaceId)
    ? spaceId
    : state.spaces[0]?.id ?? -1;

  return currentSpaceId === state.currentSpaceId
    ? state
    : { ...state, currentSpaceId };
}

export function createSpace(
  state: DashboardState,
  input: CreateSpaceInput,
): DashboardState {
  const space: SpaceV3 = {
    id: input.id,
    title: input.title,
    position:
      input.position ??
      insertBetween(getLast(state.spaces)?.position ?? "", ""),
    objectType: "space",
    folders: [],
  };

  return {
    ...state,
    spaces: sortByPosition([...state.spaces, space]),
    currentSpaceId:
      state.currentSpaceId === -1 ? input.id : state.currentSpaceId,
  };
}

export function updateSpace(
  state: DashboardState,
  spaceId: number,
  patch: SpacePatch,
): DashboardState {
  if (!state.spaces.some((space) => space.id === spaceId)) return state;
  return {
    ...state,
    spaces: sortByPosition(
      state.spaces.map((space) =>
        space.id === spaceId ? { ...space, ...patch } : space,
      ),
    ),
  };
}

export function moveSpace(
  state: DashboardState,
  input: MoveSpaceInput,
): DashboardState {
  const movingSpace = state.spaces.find((space) => space.id === input.spaceId);
  if (!movingSpace) return state;
  const spaces = state.spaces.filter((space) => space.id !== input.spaceId);
  const movedSpace = {
    ...movingSpace,
    position: getInsertionPosition(spaces, input.insertBeforeSpaceId),
  };
  return { ...state, spaces: sortByPosition([...spaces, movedSpace]) };
}

export function deleteSpace(
  state: DashboardState,
  spaceId: number,
): DashboardState {
  if (!state.spaces.some((space) => space.id === spaceId)) return state;
  const spaces = state.spaces.filter((space) => space.id !== spaceId);
  return {
    ...state,
    spaces,
    currentSpaceId:
      state.currentSpaceId === spaceId
        ? spaces[0]?.id ?? -1
        : state.currentSpaceId,
  };
}

export function createFolder(
  state: DashboardState,
  input: CreateFolderInput,
): DashboardState {
  const spaceId = input.spaceId ?? state.currentSpaceId;
  const space = state.spaces.find((candidate) => candidate.id === spaceId);
  if (!space) return state;

  const folder: FolderV3 = {
    id: input.id ?? generateLocalId(),
    objectType: "folder",
    title: input.title ?? "New folder",
    color: input.color,
    position:
      input.position ??
      insertBetween(getLast(space.folders)?.position ?? "", ""),
    items: addItemsToFolder(input.items ?? [], []),
  };
  return updateSpace(state, space.id, {
    folders: sortByPosition([...space.folders, folder]),
  });
}

export function updateFolder(
  state: DashboardState,
  folderId: number,
  patch: FolderPatch,
): DashboardState {
  return updateFolderInState(
    state,
    folderId,
    (folder) => ({ ...folder, ...patch }),
    Boolean(patch.position),
  );
}

export function deleteFolder(
  state: DashboardState,
  folderId: number,
): DashboardState {
  const space = findSpaceByFolderId(state.spaces, folderId);
  return space
    ? updateSpace(state, space.id, {
        folders: space.folders.filter((folder) => folder.id !== folderId),
      })
    : state;
}

export function moveFolder(
  state: DashboardState,
  input: MoveFolderInput,
): DashboardState {
  const sourceSpace = findSpaceByFolderId(state.spaces, input.folderId);
  const targetSpace = state.spaces.find(
    (space) => space.id === input.targetSpaceId,
  );
  const folder = sourceSpace?.folders.find(
    (candidate) => candidate.id === input.folderId,
  );
  if (!sourceSpace || !targetSpace || !folder) return state;

  const spacesWithoutFolder = state.spaces.map((space) =>
    space.id === sourceSpace.id
      ? {
          ...space,
          folders: space.folders.filter(
            (candidate) => candidate.id !== input.folderId,
          ),
        }
      : space,
  );
  const targetWithoutFolder = spacesWithoutFolder.find(
    (space) => space.id === input.targetSpaceId,
  )!;
  const movedFolder = {
    ...folder,
    position: getInsertionPosition(
      targetWithoutFolder.folders,
      input.insertBeforeFolderId,
    ),
  };
  return {
    ...state,
    spaces: spacesWithoutFolder.map((space) =>
      space.id === targetWithoutFolder.id
        ? { ...space, folders: sortByPosition([...space.folders, movedFolder]) }
        : space,
    ),
  };
}

export function createFolderItem(
  state: DashboardState,
  input: CreateFolderItemInput,
): DashboardState {
  return createFolderItems(state, { ...input, items: [input.item] });
}

export function createFolderItems(
  state: DashboardState,
  input: CreateFolderItemsInput,
): DashboardState {
  const folder = findFolderById(state.spaces, input.folderId);
  if (!folder || (input.targetGroupId && input.items.some(isGroup)))
    return state;
  const items = input.targetGroupId
    ? addItemsToGroup(
        input.items.filter(
          (item): item is FolderItemToCreate | BookmarkItemV3 => !isGroup(item),
        ),
        folder.items,
        input.targetGroupId,
        input.insertBeforeItemId,
      )
    : addItemsToFolder(input.items, folder.items, input.insertBeforeItemId);
  return updateFolderInState(state, folder.id, (current) => ({
    ...current,
    items,
  }));
}

export function updateFolderItem(
  state: DashboardState,
  itemId: number,
  patch: FolderItemPatch,
): DashboardState {
  const folder = findFolderByItemId(state.spaces, itemId);
  if (!folder) return state;
  return updateFolderInState(state, folder.id, (current) => ({
    ...current,
    items: current.items.map((item) => {
      if (item.id === itemId) return { ...item, ...patch } as ItemV3;
      if (item.type !== "group") return item;
      return {
        ...item,
        groupItems: item.groupItems.map((child) =>
          child.id === itemId ? { ...child, ...patch } : child,
        ),
      };
    }),
  }));
}

export function deleteFolderItems(
  state: DashboardState,
  itemIds: number[],
): DashboardState {
  return itemIds.reduce((current, itemId) => {
    const folder = findFolderByItemId(current.spaces, itemId);
    return folder
      ? updateFolderInState(current, folder.id, (currentFolder) => ({
          ...currentFolder,
          items: removeItemFromFolderItems(currentFolder.items, itemId),
        }))
      : current;
  }, state);
}

export function deleteFolderGroup(
  state: DashboardState,
  groupId: number,
): DashboardState {
  const folder = findFolderByItemId(state.spaces, groupId);
  const group = folder?.items.find(
    (item): item is GroupV3 => item.type === "group" && item.id === groupId,
  );
  if (!folder || !group) return state;

  return updateFolderInState(state, folder.id, (currentFolder) => ({
    ...currentFolder,
    items: addItemsToFolder(
      group.groupItems,
      currentFolder.items.filter((item) => item.id !== groupId),
    ),
  }));
}

export function moveFolderItems(
  state: DashboardState,
  input: MoveFolderItemsInput,
): DashboardState {
  const items = input.itemIds.map((itemId) =>
    findAnyItemById(state.spaces, itemId),
  );
  if (items.some((item): item is undefined => !item)) return state;
  const movingItems = items as ItemV3[];
  if (input.targetGroupId && movingItems.some(isGroup)) return state;
  const targetFolder = findFolderById(state.spaces, input.targetFolderId);
  const targetGroupExists = targetFolder?.items.some(
    (item) => item.type === "group" && item.id === input.targetGroupId,
  );
  if (!targetFolder || (input.targetGroupId && !targetGroupExists))
    return state;
  return createFolderItems(deleteFolderItems(state, input.itemIds), {
    folderId: input.targetFolderId,
    targetGroupId: input.targetGroupId,
    insertBeforeItemId: input.insertBeforeItemId,
    items: movingItems,
  });
}

function updateFolderInState(
  state: DashboardState,
  folderId: number,
  update: (folder: FolderV3) => FolderV3,
  sortFolders = false,
): DashboardState {
  const space = findSpaceByFolderId(state.spaces, folderId);
  if (!space) return state;
  const folders = space.folders.map((folder) =>
    folder.id === folderId ? update(folder) : folder,
  );
  return updateSpace(state, space.id, {
    folders: sortFolders ? sortByPosition(folders) : folders,
  });
}

function findSpaceByFolderId(
  spaces: SpaceV3[],
  folderId: number,
): SpaceV3 | undefined {
  return spaces.find((space) =>
    space.folders.some((folder) => folder.id === folderId),
  );
}

function findFolderById(
  spaces: SpaceV3[],
  folderId: number,
): FolderV3 | undefined {
  return findSpaceByFolderId(spaces, folderId)?.folders.find(
    (folder) => folder.id === folderId,
  );
}

function findFolderByItemId(
  spaces: SpaceV3[],
  itemId: number,
): FolderV3 | undefined {
  return spaces
    .flatMap((space) => space.folders)
    .find((folder) =>
      folder.items.some(
        (item) =>
          item.id === itemId ||
          (item.type === "group" &&
            item.groupItems.some((child) => child.id === itemId)),
      ),
    );
}

function findAnyItemById(
  spaces: SpaceV3[],
  itemId: number,
): ItemV3 | undefined {
  for (const folder of spaces.flatMap((space) => space.folders)) {
    for (const item of folder.items) {
      if (item.id === itemId) return item;
      if (item.type === "group") {
        const child = item.groupItems.find(
          (groupItem) => groupItem.id === itemId,
        );
        if (child) return child;
      }
    }
  }
}

function addItemsToFolder(
  insertingItems: ItemToCreateV3[],
  existingItems: ItemV3[],
  insertBeforeItemId?: number,
): ItemV3[] {
  const beforeIndex = existingItems.findIndex(
    (item) => item.id === insertBeforeItemId,
  );
  let previous =
    existingItems[
      beforeIndex === -1 ? existingItems.length - 1 : beforeIndex - 1
    ];
  const next = existingItems[beforeIndex];
  const newItems = insertingItems.map((insertingItem) => {
    const item = normalizeItem(
      insertingItem,
      insertBetween(previous?.position ?? "", next?.position ?? ""),
    );
    previous = item;
    return item;
  });
  return sortByPosition([...existingItems, ...newItems]);
}

function addItemsToGroup(
  insertingItems: Array<FolderItemToCreate | BookmarkItemV3>,
  existingItems: ItemV3[],
  targetGroupId: number,
  insertBeforeItemId?: number,
): ItemV3[] {
  return existingItems.map((item) =>
    item.type === "group" && item.id === targetGroupId
      ? {
          ...item,
          groupItems: addItemsToFolder(
            insertingItems,
            item.groupItems,
            insertBeforeItemId,
          ) as BookmarkItemV3[],
        }
      : item,
  );
}

function normalizeItem(item: ItemToCreateV3, position: string): ItemV3 {
  return isGroup(item)
    ? { ...item, position }
    : { ...item, position, type: "bookmark", objectType: "bookmark" };
}

function removeItemFromFolderItems(items: ItemV3[], itemId: number): ItemV3[] {
  return items.flatMap((item) => {
    if (item.id === itemId) return [];
    if (
      item.type !== "group" ||
      !item.groupItems.some((child) => child.id === itemId)
    )
      return [item];
    return [
      {
        ...item,
        groupItems: item.groupItems.filter((child) => child.id !== itemId),
      },
    ];
  });
}

function getInsertionPosition<T extends { id: number; position: string }>(
  items: T[],
  insertBeforeId?: number,
): string {
  const beforeIndex = items.findIndex((item) => item.id === insertBeforeId);
  const previous =
    items[beforeIndex === -1 ? items.length - 1 : beforeIndex - 1];
  return insertBetween(
    previous?.position ?? "",
    items[beforeIndex]?.position ?? "",
  );
}

function getLast<T extends { position: string }>(items: T[]): T | undefined {
  return sortByPosition(items).at(-1);
}

function isGroup(item: ItemToCreateV3): item is GroupV3 {
  return "type" in item && item.type === "group";
}

function generateLocalId(): number {
  return Date.now() + Math.round(Math.random() * 10_000_000);
}
