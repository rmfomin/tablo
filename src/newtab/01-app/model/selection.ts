import { BookmarkItemV3, SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { dashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";

let selectedItemsElements: HTMLElement[] = [];
const SELECTED_ATTR = "selected";
const FIRST_SELECTED_ATTR = "firstSelected";

export function selectItems(elements: HTMLElement[]) {
  unselectAllItems();

  elements.forEach((el: HTMLElement) => {
    el.dataset[SELECTED_ATTR] = "true";
    if (el.parentElement) {
      el.parentElement.dataset[SELECTED_ATTR] = "true";
    }
  });

  const prevSelectedElement = document.querySelector(
    `[data-first-selected="true"]`
  );
  const newFirstSelectedElement = document.querySelector(
    `[data-selected="true"]`
  );
  if (
    newFirstSelectedElement &&
    prevSelectedElement !== newFirstSelectedElement
  ) {
    (newFirstSelectedElement as HTMLElement).dataset[FIRST_SELECTED_ATTR] =
      "true";
  }
  if (prevSelectedElement) {
    delete (prevSelectedElement as HTMLElement).dataset[FIRST_SELECTED_ATTR];
  }

  selectedItemsElements = elements;
  uiStore.getState().setSelectedItemIds(elements.map((element) => getId(element)));
}

function unselectItemForced(el: HTMLElement) {
  delete el.dataset[SELECTED_ATTR];
  if (el.parentElement) {
    delete el.parentElement.dataset[SELECTED_ATTR];
  }
  document
    .querySelector(`[data-first-selected="true"]`)
    ?.removeAttribute("data-first-selected");
}

export function unselectAllItems() {
  selectedItemsElements.forEach((item) => unselectItemForced(item));
  selectedItemsElements.length = 0;
  uiStore.getState().clearSelectedItemIds();
}

export function getSelectedItemsElements(): HTMLElement[] {
  return selectedItemsElements;
}

export function getSelectedItemsIds(): number[] {
  return uiStore.getState().selectedItemIds;
}

export function getSelectedItems(): BookmarkItemV3[] {
  const { spaces } = dashboardStore.getState();

  // Выбор DOM-элементов живёт вне React, поэтому здесь нужен vanilla store,
  // а не React hook. Не найденный item мог быть удалён между select и menu.
  return getSelectedItemsIds()
    .map((itemId) => findBookmarkById(spaces, itemId))
    .filter((item): item is BookmarkItemV3 => item !== undefined);
}

function findBookmarkById(
  spaces: SpaceV3[],
  itemId: number,
): BookmarkItemV3 | undefined {
  for (const space of spaces) {
    for (const folder of space.folders) {
      for (const item of folder.items) {
        if (item.type === "bookmark" && item.id === itemId) {
          return item as BookmarkItemV3;
        }

        if (item.type === "group") {
          const groupItem = item.groupItems.find(
            (candidate) => candidate.id === itemId,
          );
          if (groupItem) return groupItem;
        }
      }
    }
  }
}

function getId(el: HTMLElement): number {
  return parseInt(el.dataset.id || "", 10);
}
