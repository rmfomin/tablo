import {
  setScrollByDummyClientY,
  subscribeMouseEvents,
  notifyDragState,
} from "@/newtab/04-features/dragging/model/dragAndDropUtils";
import {
  calculateFoldersDropAreas,
  createDropPreview,
  createTabDummy,
  getDragLayoutElement,
  getDragSourceElements,
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
} from "@/newtab/04-features/dragging/model/dragAndDrop";
import { DOM_ROLE, roleSelector } from "@/newtab/06-shared/lib/dom/roles";

export function processItemDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigItem,
  targetRoots: HTMLElement[],
  dependencies: PConfigItemDependencies
) {
  let originalContainer: HTMLElement | null = null;
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

  const cleanup = () => {
    if (!dummy) return;
    document.body.classList.remove("dragging");
    dummy.remove();
    dummy = undefined;
    removeDropPreview(previews);
    previews = [];
    restoreSource();
    if (prevHighlightedGroup) delete prevHighlightedGroup.dataset.dropTarget;
  };
  const onCancel = () => {
    const wasDragging = !!dummy;
    cleanup();
    if (wasDragging) {
      config.onCancel();
      notifyDragState(false);
    }
    dependencies.clearSelectedItemIds();
  };

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
        if (dropArea.insertAtEnd) {
          indexToDrop = dropArea.itemRects.length;
        } else {
          indexToDrop = res.index;
        }

        let previewContainer = curBoxToDrop;
        if (dropArea.insertAtEnd) {
          const folder = curBoxToDrop.closest(roleSelector(DOM_ROLE.folder));
          const fragments = folder?.querySelectorAll<HTMLElement>(
            `${roleSelector(DOM_ROLE.groupItems)}[data-group-id="${dropArea.groupId}"]`
          );
          previewContainer = fragments?.[fragments.length - 1] ?? curBoxToDrop;
        }
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
        notifyDragState(true);
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
        if (config.isFolderItem && targetRoots.length === 1) {
          // currently we support drag-and-drop of single folder only
          const targetRoot = targetRoots[0];
          // here we remember only first index from all selected elements
          const layoutElement = getDragLayoutElement(targetRoot);
          originalContainer = layoutElement.parentElement;
          originalIndex = Array.from(originalContainer!.children).indexOf(
            layoutElement
          );
        }
        restoreSource = setDragSourceHidden(
          getDragSourceElements(targetRoots)
        );
        onViewportScrolled();
        onMouseMove(e, true);
      }
    }
  };
  const onMouseUp = () => {
    if (dummy) {
      const insertBeforeItemId = currentDropArea?.insertAtEnd || !prevBoxToDrop
        ? undefined
        : getItemIdByIndex(prevBoxToDrop, indexToDrop);
      cleanup();
      const tryAddToOriginalPos =
        currentDropArea?.element === originalContainer &&
        !currentDropArea?.insertAtEnd &&
        indexToDrop === originalIndex;
      if (prevBoxToDrop && !tryAddToOriginalPos) {
        const folderId = getFolderId(prevBoxToDrop);
        config.onDrop(
          folderId,
          insertBeforeItemId,
          getIdsFromElements(targetRoots),
          currentDropArea?.groupId
        );
      } else {
        config.onCancel();
      }
      notifyDragState(false);
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
    onViewportScrolled,
    onCancel
  );
  return unsubscribeEvents;
}
