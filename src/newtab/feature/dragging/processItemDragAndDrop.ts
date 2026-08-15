import {
  setScrollByDummyClientY,
  subscribeMouseEvents,
} from "@/newtab/feature/dragging/dragAndDropUtils";
import {
  calculateFoldersDropAreas,
  createDropPreview,
  createTabDummy,
  getDragLayoutElement,
  getFolderId,
  getIdsFromElements,
  getItemIdByIndex,
  getItemDropAreaElements,
  getNewPlacementForItem,
  getOverlappedDropArea,
  placeDropPreview,
  PConfigItem,
  removeDropPreview,
  setDragSourceHidden,
  DropArea,
  PConfigItemDependencies,
} from "@/newtab/feature/dragging/dragAndDrop";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";

export function processItemDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigItem,
  targetRoots: HTMLElement[],
  dependencies: PConfigItemDependencies
) {
  let originalFolderId: number;
  let originalIndex: number;
  let dummy: undefined | HTMLElement = undefined;
  let previews: HTMLElement[] = [];
  let restoreSource = () => {};
  const canDropIntoGroups = targetRoots.every(
    (targetRoot) => targetRoot.dataset.role !== DOM_ROLE.groupHeader
  );

  const getFolderElements = () =>
    getItemDropAreaElements(document, canDropIntoGroups);
  let dropAreas = calculateFoldersDropAreas(getFolderElements(), true);

  let prevBoxToDrop: HTMLElement | undefined = undefined;
  let prevHighlightedGroup: HTMLElement | undefined = undefined;
  let currentDropArea: DropArea | undefined = undefined;
  let indexToDrop: number;
  let targetFolderId: number;

  const onViewportScrolled = () => {
    // recalculate drop areas if viewport was scrolled
    dropAreas = calculateFoldersDropAreas(getFolderElements(), true);
  };

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${
        e.clientY + "px"
      })`;

      // find target position
      const dropArea = getOverlappedDropArea(dropAreas, e);
      currentDropArea = dropArea;
      const curBoxToDrop = dropArea ? dropArea.element : undefined;
      if (curBoxToDrop !== prevBoxToDrop) {
        if (prevHighlightedGroup) {
          delete prevHighlightedGroup.dataset.dropTarget;
        }
        prevHighlightedGroup = undefined;

        if (curBoxToDrop) {
          if (dropArea?.insertAtEnd) {
            prevHighlightedGroup =
              (curBoxToDrop.closest(
                roleSelector(DOM_ROLE.folderGroup)
              ) as HTMLElement | null) ?? undefined;
            if (prevHighlightedGroup) {
              prevHighlightedGroup.dataset.dropTarget = "true";
            }
          }
        }
        prevBoxToDrop = curBoxToDrop;
      }
      if (curBoxToDrop && dropArea) {
        const res = getNewPlacementForItem(dropArea, e);
        targetFolderId = dropArea.objectId;
        const targetGroupId = dropArea.groupId;
        const tryAddToOriginalPos =
          !targetGroupId &&
          targetFolderId === originalFolderId &&
          res.index === originalIndex;
        if (tryAddToOriginalPos) {
          indexToDrop = originalIndex;
        } else if (dropArea.insertAtEnd) {
          indexToDrop = dropArea.itemRects.length;
        } else {
          indexToDrop = res.index;
        }

        const previewContainer = dropArea.insertAtEnd
          ? (curBoxToDrop
              .closest(roleSelector(DOM_ROLE.folderGroup))
              ?.querySelector(roleSelector(DOM_ROLE.groupItems)) as HTMLElement)
          : curBoxToDrop;
        if (previewContainer) {
          removeDropPreview(previews);
          previews = createDropPreview(targetRoots);
          placeDropPreview(
            previewContainer,
            previews,
            dropArea.insertAtEnd ? Number.MAX_SAFE_INTEGER : indexToDrop
          );
        }
      } else {
        removeDropPreview(previews);
        previews = [];
      }

      setScrollByDummyClientY(e.clientY);
    } else {
      if (mouseMoved) {
        if (!config.onDragStarted()) {
          unsubscribeEvents();
          return;
        }
        //create dummy
        dummy = createTabDummy(
          targetRoots,
          mouseDownEvent,
          config.isFolderItem
        );
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${
          e.clientY + "px"
        })`;
        document.body.classList.add("dragging");
        document.body.append(dummy);
        if (config.isFolderItem) {
          // currently we support drag-and-drop of single folder only
          const targetRoot = targetRoots[0];
          // here we remember only first index from all selected elements
          originalIndex = Array.from(
            targetRoot.parentElement!.parentElement!.children
          ).indexOf(targetRoot.parentElement!);
          originalFolderId = getFolderId(
            targetRoot.parentElement!.parentElement!
          );
        }
        restoreSource = setDragSourceHidden(
          targetRoots.map(getDragLayoutElement)
        );
        onViewportScrolled();
        onMouseMove(e, true);
      }
    }
  };
  const onMouseUp = () => {
    if (dummy) {
      document.body.classList.remove("dragging");
      dummy.remove();
      removeDropPreview(previews);
      restoreSource();
      if (prevHighlightedGroup) {
        delete prevHighlightedGroup.dataset.dropTarget;
      }
      const tryAddToOriginalPos =
        !currentDropArea?.groupId &&
        targetFolderId === originalFolderId &&
        indexToDrop === originalIndex;
      if (prevBoxToDrop && !tryAddToOriginalPos) {
        const folderId = getFolderId(prevBoxToDrop);
        const insertBeforeItemId = currentDropArea?.insertAtEnd
          ? undefined
          : getItemIdByIndex(prevBoxToDrop, indexToDrop);
        config.onDrop(
          folderId,
          insertBeforeItemId,
          getIdsFromElements(targetRoots),
          currentDropArea?.groupId
        );
      } else {
        config.onCancel();
      }
    } else {
      // we can click only by single element
      config.onClick(getIdsFromElements(targetRoots)[0]);
    }

    dependencies.clearSelectedItemIds();
  };

  const unsubscribeEvents = subscribeMouseEvents(
    mouseDownEvent,
    onMouseMove,
    onMouseUp,
    onViewportScrolled
  );
  return unsubscribeEvents;
}
