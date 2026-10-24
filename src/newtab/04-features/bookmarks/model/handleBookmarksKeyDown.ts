import React from "react";
import type { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { DOM_ROLE, roleSelector } from "@/newtab/06-shared/lib/dom/roles";

const FOLDER_ITEM_SELECTOR = `a${roleSelector(DOM_ROLE.folderItem)}`;

function focusNextItem(
  folderItems: Element[],
  currentElement: Element,
  offset: number
) {
  if (folderItems.length === 0) {
    return;
  }
  const currentIndex = Array.from(folderItems).indexOf(currentElement);
  let nextIndex = currentIndex + offset;
  if (nextIndex === -1) {
    nextIndex = folderItems.length - 1;
  } else if (nextIndex === folderItems.length) {
    nextIndex = 0;
  }

  (folderItems[nextIndex] as HTMLDivElement).focus();
}

function focusVerticalItem(offset: number) {
  if (document.activeElement) {
    const folderItems = convertItemsIntoVerticalList();
    focusNextItem(folderItems, document.activeElement, offset);
  }
}

type BookmarksKeyboardState = { spaces: SpaceV3[] };

function focusHorizontalItem(offset: number, appState: BookmarksKeyboardState) {
  if (document.activeElement) {
    const folderItems = convertItemsIntoHorizontalList(
      document.activeElement as HTMLElement,
      appState
    );
    focusNextItem(folderItems, document.activeElement, offset);
  }
}

function openFocusedItem(
  event: React.KeyboardEvent,
  onOpen: (itemId: number, inNewTab: boolean) => void,
) {
  const link = event.target as HTMLLinkElement;
  if (link && link.href) {
    const itemId = Number(link.dataset.id);
    if (itemId) {
      const inNewTab =
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
      onOpen(itemId, inNewTab);
    }
  }
}

export function handleBookmarksKeyDown(
  event: React.KeyboardEvent,
  appState: BookmarksKeyboardState,
  onOpen: (itemId: number, inNewTab: boolean) => void,
) {
  const activeElement = document.activeElement as HTMLElement;
  const isActiveLink =
    activeElement && activeElement.dataset.role === DOM_ROLE.folderItem;
  if (!isActiveLink) {
    return;
  }

  switch (event.code) {
    case "ArrowUp":
      focusVerticalItem(-1);
      event.preventDefault();
      break;
    case "ArrowDown":
      focusVerticalItem(1);
      event.preventDefault();
      break;
    case "ArrowLeft":
      focusHorizontalItem(-1, appState);
      event.preventDefault();
      break;
    case "ArrowRight":
      focusHorizontalItem(1, appState);
      event.preventDefault();
      break;
    case "Space":
    case "Enter":
      openFocusedItem(event, onOpen);
      event.preventDefault();
    default:
      break;
  }
}

type VisualColumn = {
  element: HTMLElement;
  rect: DOMRect;
  items: HTMLElement[];
};

function isVisibleItem(item: HTMLElement): boolean {
  if (item.closest('[data-dad-preview="true"], .dad-dummy, [hidden]')) return false;
  for (let element: HTMLElement | null = item; element; element = element.parentElement) {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }
  return true;
}

function getVisualColumns(): VisualColumn[] {
  return Array.from(document.querySelectorAll<HTMLElement>(roleSelector(DOM_ROLE.folderItems)))
    .filter((element) => !element.closest('[data-folder-new="true"]'))
    .map((element) => ({
      element,
      rect: element.getBoundingClientRect(),
      items: Array.from(element.querySelectorAll<HTMLElement>(FOLDER_ITEM_SELECTOR))
        .filter(isVisibleItem)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top),
    }))
    .filter((column) => column.items.length > 0);
}

function convertItemsIntoVerticalList(): Element[] {
  return getVisualColumns()
    .sort((a, b) => a.rect.left - b.rect.left || a.rect.top - b.rect.top)
    .flatMap((column) => column.items);
}

function convertItemsIntoHorizontalList(
  currentItem: HTMLElement,
  _appState: BookmarksKeyboardState
): Element[] {
  const columns = getVisualColumns();
  const currentColumn = columns.find((column) => column.items.includes(currentItem));
  if (!currentColumn) return [];
  const currentRect = currentItem.getBoundingClientRect();
  const currentY = currentRect.top + currentRect.height / 2;
  const itemsByPhysicalColumn = new Map<number, HTMLElement[]>();
  columns.forEach((column) => {
    const items = itemsByPhysicalColumn.get(column.rect.left) ?? [];
    items.push(...column.items);
    itemsByPhysicalColumn.set(column.rect.left, items);
  });
  return Array.from(itemsByPhysicalColumn.entries())
    .sort(([leftA], [leftB]) => leftA - leftB)
    .map(([left, items]) => {
      if (left === currentColumn.rect.left) return currentItem;
      return items.reduce((nearest, item) => {
        const nearestRect = nearest.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        return Math.abs(itemRect.top + itemRect.height / 2 - currentY) <
          Math.abs(nearestRect.top + nearestRect.height / 2 - currentY) ? item : nearest;
      });
    });
}

let trackSearchUsedTimeout: ReturnType<typeof setTimeout> | null = null;

export function handleSearchKeyDown(
  event: React.KeyboardEvent,
  onClearSearch: () => void
) {
  if (event.code === "ArrowDown") {
    const firstFolderItem = Array.from(document.querySelectorAll<HTMLElement>(
      FOLDER_ITEM_SELECTOR
    )).find(isVisibleItem);
    if (firstFolderItem) {
      firstFolderItem.focus();
      event.preventDefault();
    }
  } else if (event.code === "Escape") {
    onClearSearch();
  } else {
    if (trackSearchUsedTimeout) {
      clearTimeout(trackSearchUsedTimeout);
    }
  }
}
