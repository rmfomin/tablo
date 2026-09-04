import {
  isSomeParentHaveClass,
  isTargetInputOrTextArea,
} from "@/newtab/06-shared/lib/dom/html";
import { Point } from "@/newtab/06-shared/lib/math";
import { processFolderDragAndDrop } from "@/newtab/04-features/dragging/model/processFolderDragAndDrop";
import { processItemDragAndDrop } from "@/newtab/04-features/dragging/model/processItemDragAndDrop";
import { processSpacesDragAndDrop } from "@/newtab/04-features/dragging/model/processSpacesDragAndDrop";
import { DOM_ROLE, roleSelector } from "@/newtab/06-shared/lib/dom/roles";
import type { PConfigItemDependencies } from "./dragAndDropDependencies";

export type DropArea = {
  objectId: number;
  groupId?: number;
  insertAtEnd?: boolean;
  element: HTMLElement;
  rect: DOMRect;
  itemRects: { thresholdY: number; itemTop: number; itemHeight: number }[];
};

export type PConfigItem = {
  isFolderItem: boolean; // otherwise we drag-and-drop from sidebar
  onDrop: (
    folderId: number,
    insertBeforeItemId: number | undefined,
    targetsIds: number[],
    targetGroupId?: number
  ) => void;
  onCancel: () => void;
  onClick: (targetId: number) => void;
  onDragStarted: () => boolean; // return false to prevent action. Previously was named canDrag()
};

export type { PConfigItemDependencies } from "./dragAndDropDependencies";

export type PConfigFolder = {
  onDrop: (
    draggedFolderId: number,
    targetSpaceId: number | undefined,
    insertBeforeFolderId: number | undefined
  ) => void;
  onCancel: () => void;
  onChangeSpace: (spaceId: number) => void;
  onDragStarted: () => boolean; // return false to prevent action. Previously was named canDrag()
};

export type PConfigSpaces = {
  onChangeSpacePosition: (spaceId: number, newPosition: string) => void;
  canSortSpaces: () => boolean;
};

export function bindDADItemEffect(
  mouseDownEvent: React.MouseEvent,
  itemConfig: PConfigItem,
  dependencies: PConfigItemDependencies,
  folderConfig?: PConfigFolder,
  spacesConfig?: PConfigSpaces
) {
  const target = mouseDownEvent.target as HTMLElement;
  const targetRoot = findRootOfDraggableItem(target);
  const clickOnUIElement = isSomeParentHaveClass(target, [
    "dropdown-menu",
    "modal-wrapper",
  ]);
  const targetFolderHeader = findRootOfDraggableFolder(target);

  if (isTargetInputOrTextArea(target) || clickOnUIElement) {
    return;
  }

  if (mouseDownEvent.button === 0) {
    // LEFT_CLICK
    if (targetRoot) {
      const targetRoots = getSelectedTargetRoots(
        targetRoot,
        dependencies.selectedItemIds
      );
      return processItemDragAndDrop(
        mouseDownEvent,
        itemConfig,
        targetRoots,
        dependencies
      );
    } else if (targetFolderHeader && folderConfig) {
      dependencies.clearSelectedItemIds();
      return processFolderDragAndDrop(
        mouseDownEvent,
        folderConfig,
        targetFolderHeader.parentElement!
      );
    } else if (
      spacesConfig &&
      target.closest(roleSelector(DOM_ROLE.spaceItem))
    ) {
      if (
        !target.closest(roleSelector(DOM_ROLE.spaceDelete)) &&
        spacesConfig.canSortSpaces()
      ) {
        dependencies.clearSelectedItemIds();
        processSpacesDragAndDrop(mouseDownEvent, spacesConfig, dependencies);
      }
    }
  }
}

export function getSelectedTargetRoots(
  pressedRoot: HTMLElement,
  selectedItemIds: number[],
  root: ParentNode = document
): HTMLElement[] {
  const pressedGroup = pressedRoot.closest(
    roleSelector(DOM_ROLE.folderGroup)
  ) as HTMLElement | null;
  const directPressedId = getIdFromElement(pressedRoot);
  const pressedId = selectedItemIds.includes(directPressedId)
    ? directPressedId
    : pressedGroup
    ? Number(pressedGroup.dataset.groupId)
    : directPressedId;
  if (!selectedItemIds.includes(pressedId)) {
    return [pressedRoot];
  }

  return selectedItemIds.flatMap((id) => {
    const element = root.querySelector<HTMLElement>(
      `${roleSelector(DOM_ROLE.folderItem)}[data-id="${id}"], ${roleSelector(
        DOM_ROLE.groupHeader
      )}[data-id="${id}"]`
    );
    return element ? [element] : [];
  });
}

export function getItemDropAreaElements(
  root: ParentNode = document,
  canDropIntoGroups = true
): Element[] {
  const selectors = [roleSelector(DOM_ROLE.folderItems)];
  if (canDropIntoGroups) {
    selectors.unshift(
      roleSelector(DOM_ROLE.groupHeader),
      roleSelector(DOM_ROLE.groupItems)
    );
  }
  return Array.from(root.querySelectorAll(selectors.join(", ")));
}

const FOLDER_TOP_OFFSET = 50;
const FOLDER_BOTTOM_OFFSET = 20;

export function getOverlappedDropArea(
  dropAreas: DropArea[],
  e: MouseEvent
): DropArea | undefined {
  const realRectAreas = dropAreas.filter((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top < e.clientY &&
      e.clientY < da.rect.bottom
    );
  });

  if (realRectAreas.length > 0) {
    return realRectAreas.sort(compareDropAreasByPriority)[0];
  }

  const overlappedAreas = dropAreas.filter((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top - FOLDER_TOP_OFFSET < e.clientY &&
      e.clientY < da.rect.bottom + FOLDER_BOTTOM_OFFSET
    );
  });

  return overlappedAreas.sort(compareDropAreasByPriority)[0];
}

function compareDropAreasByPriority(a: DropArea, b: DropArea): number {
  return a.rect.width * a.rect.height - b.rect.width * b.rect.height;
}

export function getOverlappedSpaceDropArea(
  dropAreas: DropArea[],
  e: MouseEvent
): DropArea | undefined {
  return dropAreas.find((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top < e.clientY &&
      e.clientY < da.rect.bottom
    );
  });
}

export function getNewPlacementForItem(
  dropArea: DropArea,
  e: MouseEvent
): { placeholderY: number; index: number } {
  const deltaY = e.clientY - dropArea.rect.y;

  const index = dropArea.itemRects.findIndex((r) => deltaY < r.thresholdY);
  if (index === -1) {
    const len = dropArea.itemRects.length;
    return {
      index: len,
      placeholderY:
        len > 0
          ? dropArea.itemRects[len - 1].itemTop +
            dropArea.itemRects[len - 1].itemHeight
          : 0,
    };
  } else {
    return {
      index,
      placeholderY: dropArea.itemRects[index].itemTop,
    };
  }
}

/**
 * "undefined" result means we should insert Folder to the very end
 */
export function calculateTargetInsertBeforeFolderId(
  dropAreas: DropArea[],
  dropArea: DropArea,
  insertBefore: boolean
): number | undefined {
  if (insertBefore) {
    return dropArea.objectId;
  } else {
    const indexOfNextDropArea = dropAreas.indexOf(dropArea) + 1;
    return indexOfNextDropArea < dropAreas.length
      ? dropAreas[indexOfNextDropArea].objectId
      : undefined;
  }
}

function findRootOfDraggableFolder(
  targetElement: HTMLElement
): HTMLElement | null {
  if (doStopPropagation(targetElement)) {
    return null;
  }

  if (isDraggableFolderHeader(targetElement)) {
    return targetElement;
  }

  if (isDraggableFolderHeader(targetElement.parentElement)) {
    return targetElement.parentElement;
  }

  return null;
}

function findRootOfDraggableItem(
  targetElement: HTMLElement
): HTMLElement | null {
  if (doStopPropagation(targetElement)) {
    return null;
  }

  if (isDraggableItemRoot(targetElement)) {
    return targetElement;
  }
  if (isDraggableItemRoot(targetElement.parentElement)) {
    return targetElement.parentElement;
  }
  if (
    targetElement.parentElement &&
    isDraggableItemRoot(targetElement.parentElement.parentElement)
  ) {
    return targetElement.parentElement.parentElement;
  }
  return null;
}

function isDraggableItemRoot(targetElement: HTMLElement | null): boolean {
  return targetElement
    ? targetElement.classList.contains("draggable-item")
    : false;
}

export function isDraggableFolderHeader(
  targetElement: HTMLElement | null
): boolean {
  return targetElement
    ? targetElement.classList.contains("draggable-folder")
    : false;
}

export function doStopPropagation(targetElement: HTMLElement | null): boolean {
  return isSomeParentHaveClass(targetElement, "stop-dad-propagation");
}

export function getFolderId(dropAreaElement: HTMLElement): number {
  return getDropAreaFolderId(dropAreaElement);
}

export function getDropAreaFolderId(dropAreaElement: HTMLElement): number {
  return parseInt(dropAreaElement.dataset.folderId!);
}

export function getDropAreaGroupId(
  dropAreaElement: HTMLElement
): number | undefined {
  const groupId = dropAreaElement.dataset.groupId;
  return groupId ? parseInt(groupId, 10) : undefined;
}

export function getSpaceId(dropAreaElement: HTMLElement): number {
  return parseInt(dropAreaElement.dataset.spaceId!);
}

export function getPosFromElement(el: HTMLElement): Point {
  return {
    x: parseFloat(el.style.left),
    y: parseFloat(el.style.top),
  };
}

export function getIdsFromElements(targets: HTMLElement[]): number[] {
  return targets.map(getIdFromElement);
}

export function getIdFromElement(target: HTMLElement): number {
  return parseInt(target.dataset.id!, 10);
}

export function getItemIdByIndex(
  currentBoxToDrop: HTMLElement,
  index: number
): number | undefined {
  const children = getDropAreaChildren(currentBoxToDrop);
  if (index >= children.length) {
    return undefined; //means paste last
  } else {
    const child = children[index];
    const item = child.querySelector(
      `:scope > ${roleSelector(DOM_ROLE.folderItem)}, :scope > ${roleSelector(
        DOM_ROLE.groupHeader
      )}`
    ) as HTMLElement;
    return parseInt(item.dataset.id!, 10);
  }
}

export function createTabDummy(
  targetRoots: HTMLElement[],
  mouseDownEvent: React.MouseEvent,
  isFolderItem: boolean
): HTMLElement {
  const dummy = document.createElement("div");
  targetRoots.forEach((selectedEl) => {
    const previewEl = getDragPreviewElement(selectedEl);
    const clonedNode = previewEl.cloneNode(true) as HTMLElement;
    clonedNode.dataset.selected = "true";
    clonedNode
      .querySelectorAll(roleSelector(DOM_ROLE.alreadySaved))
      .forEach((el) => {
        (el as HTMLElement).style.display = "block";
      });
    dummy.append(clonedNode);
  });
  const rect = getDragPreviewElement(targetRoots[0]).getBoundingClientRect();
  dummy.style.width = `${rect.width + 4}px`;
  dummy.style.marginTop = `${rect.top - mouseDownEvent.clientY}px`;
  dummy.style.marginLeft = `${rect.left - mouseDownEvent.clientX}px`;
  dummy.classList.add("dad-dummy");
  if (isFolderItem) {
    dummy.classList.add("dad-dummy--folder-item");
  }

  return dummy;
}

export function getDragPreviewElement(targetRoot: HTMLElement): HTMLElement {
  if (targetRoot.dataset.role === DOM_ROLE.groupHeader) {
    return targetRoot.parentElement!;
  }

  return targetRoot;
}

export function getDragLayoutElement(targetRoot: HTMLElement): HTMLElement {
  if (targetRoot.dataset.role === DOM_ROLE.groupHeader) {
    return targetRoot.parentElement!;
  }

  if (targetRoot.dataset.role === DOM_ROLE.folderItem) {
    return targetRoot.parentElement!;
  }

  return targetRoot;
}

export function setDragSourceHidden(elements: HTMLElement[]): () => void {
  const displays = new Map<HTMLElement, string>();
  elements.forEach((element) => {
    if (!displays.has(element)) {
      displays.set(element, element.style.display);
      element.style.display = "none";
    }
  });

  let restored = false;
  return () => {
    if (restored) {
      return;
    }
    restored = true;
    displays.forEach((display, element) => {
      element.style.display = display;
    });
  };
}

export function createDropPreview(targetRoots: HTMLElement[]): HTMLElement[] {
  return targetRoots.map((targetRoot) => {
    const preview = getDragLayoutElement(targetRoot).cloneNode(
      true
    ) as HTMLElement;
    preview.style.removeProperty("display");
    preview.dataset.dadPreview = "true";
    preview.classList.add("dad-drop-preview");
    return preview;
  });
}

export function placeDropPreview(
  container: HTMLElement,
  previews: HTMLElement[],
  index: number
) {
  previews.forEach((preview) => preview.remove());
  const insertBefore = getDropAreaChildren(container)[index];
  previews.forEach((preview) =>
    container.insertBefore(preview, insertBefore ?? null)
  );
}

export function removeDropPreview(previews: HTMLElement[]) {
  previews.forEach((preview) => preview.remove());
}

export function createFolderDropIndicator(): HTMLElement {
  const indicator = document.createElement("div");
  indicator.classList.add("dad-folder-drop-indicator");
  return indicator;
}

export function placeFolderDropIndicator(
  indicator: HTMLElement,
  dropArea: DropArea,
  insertBefore: boolean
) {
  if (!indicator.isConnected) {
    document.body.append(indicator);
  }
  indicator.style.left = `${
    insertBefore ? dropArea.rect.left : dropArea.rect.right
  }px`;
  indicator.style.top = `${dropArea.rect.top}px`;
  indicator.style.height = `${dropArea.rect.height}px`;
}

export function removeFolderDropIndicator(indicator: HTMLElement | undefined) {
  indicator?.remove();
}

export function calculateFoldersDropAreas(
  folderEls: Element[],
  calcItemRects = false
): DropArea[] {
  return folderEls
    .filter((el) => !el.closest?.('[data-dad-preview="true"]'))
    .map((el) => ({
      objectId: getDropAreaFolderId(el as HTMLElement),
      groupId: getDropAreaGroupId(el as HTMLElement),
      insertAtEnd: (el as HTMLElement).dataset.dropInsert === "end",
      element: el as HTMLElement,
      rect: el.getBoundingClientRect(),
      itemRects: calcItemRects
        ? getDropAreaChildren(el as HTMLElement).map((item) => {
            //todo support grid
            const offsetTop = (item as HTMLElement).offsetTop;
            return {
              thresholdY: offsetTop + item.clientHeight / 2,
              itemTop: offsetTop,
              itemHeight: item.clientHeight,
            };
          })
        : null!,
    }));
}

function getDropAreaChildren(container: HTMLElement): HTMLElement[] {
  return Array.from(
    { length: container.children.length },
    (_, index) => container.children.item(index)! as HTMLElement
  ).filter((child) => child.dataset?.dadPreview !== "true");
}

export function calculateSpacesDropAreas(): DropArea[] {
  const spacesEls = Array.from(
    document.querySelectorAll(roleSelector(DOM_ROLE.spaceItem))
  );
  return spacesEls.map((el) => ({
    objectId: getSpaceId(el as HTMLElement),
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: null!,
  }));
}

export function createFolderDummy(
  targetRoot: HTMLElement,
  mouseDownEvent: React.MouseEvent
): HTMLElement {
  // targetRoot.style.opacity = `0.4`
  const dummy = document.createElement("div");
  dummy.append(targetRoot.cloneNode(true));
  dummy.style.opacity = "0.8";
  const itemsBoxEl = dummy.querySelector<HTMLElement>(
    roleSelector(DOM_ROLE.folderItems)
  )!;
  itemsBoxEl.style.visibility = "hidden";

  const rect = targetRoot.getBoundingClientRect();
  dummy.style.width = `${rect.width}px`;
  dummy.style.marginTop = `${rect.top - mouseDownEvent.clientY}px`;
  dummy.style.marginLeft = `${rect.left - mouseDownEvent.clientX}px`;
  dummy.classList.add("dad-dummy");
  return dummy;
}

export function createPlaceholder(forItem: boolean) {
  const dummy = document.createElement("div");
  dummy.classList.add(
    forItem ? "bm-item-placeholder" : "bm-folder-placeholder"
  );
  return dummy;
}
