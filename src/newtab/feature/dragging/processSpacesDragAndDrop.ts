import type { PConfigSpaces } from "@/newtab/feature/dragging/dragAndDrop";
import { subscribeMouseEvents } from "@/newtab/feature/dragging/dragAndDropUtils";
import { insertBetween } from "@/newtab/helpers/fractionalIndexes";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";
import { uiStore } from "@/newtab/state/ui/uiStore";

type InitRes = {
  clonedSpacesList: HTMLElement;
  clonedSpacesListRect: DOMRect;
  clonedItems: HTMLElement[];
  itemSlotLefts: number[];
  draggingItem: HTMLElement;
  draggingItemStartLeft: number;
  draggingItemStartPosition: string;
};

export function processSpacesDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigSpaces
) {
  let dummy: InitRes | undefined;
  let restoreSource = () => {};
  let prevOverItem: HTMLElement | undefined = undefined;
  let prevInsertType: string = "";

  const target = (mouseDownEvent.target as HTMLElement).closest(
    roleSelector(DOM_ROLE.spaceItem)
  ) as HTMLElement | null;

  if (!target) {
    return;
  }

  function findOverItem(mouseX: number) {
    let overItem: HTMLElement | undefined = undefined;
    let insertType = "";
    dummy!.clonedItems.some((item) => {
      if (item === dummy!.draggingItem) {
        return false;
      }
      const rect = item.getBoundingClientRect();
      if (rect.left < mouseX && mouseX < rect.right) {
        overItem = item;
        insertType = rect.left + rect.width / 2 < mouseX ? "after" : "before";
        return true;
      }
    });
    return {
      overItem,
      insertType,
    };
  }

  function insertSpaceBetween(overItem: HTMLElement, insertType: string) {
    const items = getSortedItems(dummy!.clonedItems);
    const overItemIndex = items.indexOf(overItem);
    if (insertType === "before") {
      dummy!.draggingItem.dataset.position = insertBetween(
        items[overItemIndex - 1]?.dataset.position ?? "",
        overItem.dataset.position!
      );
    } else {
      dummy!.draggingItem.dataset.position = insertBetween(
        overItem.dataset.position!,
        items[overItemIndex + 1]?.dataset.position ?? ""
      );
    }

    updateItemsOrder(
      dummy!.clonedItems,
      dummy!.itemSlotLefts,
      dummy!.draggingItem
    );
  }

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (dummy) {
      // move dummy
      const delta = mouseDownEvent.clientX - e.clientX;
      const isInsideSpacesList =
        dummy.clonedSpacesListRect.left - 10 < e.clientX &&
        e.clientX < dummy.clonedSpacesListRect.right + 10 &&
        dummy.clonedSpacesListRect.top - 10 < e.clientY &&
        e.clientY < dummy.clonedSpacesListRect.bottom + 10;
      if (isInsideSpacesList) {
        document.body.classList.remove("spaces-drag-outside");
        dummy.draggingItem.style.left = `${
          dummy.draggingItemStartLeft - delta
        }px`;
        const { overItem, insertType } = findOverItem(e.clientX);
        if (
          overItem &&
          shouldUpdateSpaceInsertPreview(
            prevOverItem,
            prevInsertType,
            overItem,
            insertType
          )
        ) {
          prevOverItem = overItem;
          prevInsertType = insertType;
          insertSpaceBetween(overItem, insertType);
        }
      } else {
        document.body.classList.add("spaces-drag-outside");
        dummy.draggingItem.style.left = `${dummy.draggingItemStartLeft}px`;
        dummy.draggingItem.dataset.position = dummy.draggingItemStartPosition;
        updateItemsOrder(
          dummy.clonedItems,
          dummy.itemSlotLefts,
          dummy.draggingItem
        );
        prevOverItem = undefined;
        prevInsertType = "";
      }
    } else if (mouseMoved) {
      //create dummy
      dummy = createClonedSpacesList(target);
      document.body.appendChild(dummy.clonedSpacesList);
      const sourceVisibility = target.style.visibility;
      target.style.visibility = "hidden";
      restoreSource = () => {
        target.style.visibility = sourceVisibility;
      };
    }
  };
  const onMouseUp = () => {
    if (dummy) {
      document.body.classList.remove("dragging");
      document.body.classList.remove("spaces-drag-outside");
      dummy.clonedSpacesList.remove();
      restoreSource();
      config.onChangeSpacePosition(
        parseInt(dummy.draggingItem.dataset.spaceId!, 10),
        dummy.draggingItem.dataset.position!
      );
    } else {
      // do nothing here
    }

    uiStore.getState().clearSelectedItemIds();
  };

  return subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp);
}

export function shouldUpdateSpaceInsertPreview(
  prevOverItem: HTMLElement | undefined,
  prevInsertType: string,
  overItem: HTMLElement,
  insertType: string
): boolean {
  return prevOverItem !== overItem || prevInsertType !== insertType;
}

function createClonedSpacesList(target: HTMLElement): InitRes {
  const origSpacesList = document.querySelector(
    roleSelector(DOM_ROLE.spacesList)
  ) as HTMLElement;
  const origItems = Array.from(
    origSpacesList.querySelectorAll(roleSelector(DOM_ROLE.spaceItem))
  );

  const listRect = origSpacesList.getBoundingClientRect();
  const clonedSpacesList = origSpacesList.cloneNode() as HTMLElement;
  clonedSpacesList.classList.add("dummy");
  clonedSpacesList.style.position = "absolute";
  clonedSpacesList.style.boxSizing = "border-box";
  clonedSpacesList.style.width = `${listRect.width}px`;
  clonedSpacesList.style.height = `${listRect.height}px`;
  clonedSpacesList.style.top = `${listRect.top}px`;
  clonedSpacesList.style.left = `${listRect.left}px`;

  let draggingItem: HTMLElement = undefined!;
  let clonedItems: HTMLElement[] = [];
  let itemSlotLefts: number[] = [];
  origItems.forEach((item) => {
    const clonedItem = item.cloneNode(true) as HTMLElement;
    const itemRect = item.getBoundingClientRect();
    clonedItem.style.position = "absolute";
    clonedItem.style.boxSizing = "border-box";
    clonedItem.style.width = `${itemRect.width}px`;
    clonedItem.style.top = `${itemRect.top - listRect.top}px`;
    clonedItem.style.left = `${itemRect.left - listRect.left}px`;

    if (target.dataset.spaceId === clonedItem.dataset.spaceId) {
      clonedItem.classList.add("dummy");
      draggingItem = clonedItem;
    }

    clonedSpacesList.append(clonedItem);
    clonedItems.push(clonedItem);
  });
  draggingItem.style.zIndex = "10";
  itemSlotLefts = getSortedItems(clonedItems).map((item) =>
    parseFloat(item.style.left)
  );
  updateItemsOrder(clonedItems, itemSlotLefts);

  return {
    clonedSpacesList,
    clonedSpacesListRect: listRect,
    clonedItems,
    itemSlotLefts,
    draggingItem,
    draggingItemStartLeft: parseFloat(draggingItem.style.left),
    draggingItemStartPosition: draggingItem.dataset.position!,
  };
}

function updateItemsOrder(
  items: HTMLElement[],
  itemSlotLefts: number[],
  skipElement?: HTMLElement
) {
  const itemsArray = getSortedItems(items);
  itemsArray.forEach((item, index) => {
    if (item !== skipElement) {
      item.style.left = `${itemSlotLefts[index]}px`;
    }
  });
}

function getSortedItems(items: HTMLElement[]): HTMLElement[] {
  return items.sort((a, b) => {
    if (a.dataset.position! < b.dataset.position!) {
      return -1;
    } else if (a.dataset.position! > b.dataset.position!) {
      return 1;
    }
    return 0;
  });
}
