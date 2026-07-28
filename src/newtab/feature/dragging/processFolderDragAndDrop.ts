import {
  calculateFoldersDropAreas,
  calculateSpacesDropAreas,
  calculateTargetInsertBeforeFolderId,
  createFolderDummy,
  createFolderDropIndicator,
  DropArea,
  getFolderId,
  getOverlappedDropArea,
  getOverlappedSpaceDropArea,
  placeFolderDropIndicator,
  PConfigFolder,
  removeFolderDropIndicator,
  setDragSourceHidden,
} from "@/newtab/feature/dragging/dragAndDrop";
import {
  setScrollByDummyClientY,
  subscribeMouseEvents,
} from "@/newtab/feature/dragging/dragAndDropUtils";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";

export function processFolderDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigFolder,
  targetRoot: HTMLElement
) {
  let dummy: undefined | HTMLElement = undefined;
  let dropIndicator: HTMLElement | undefined = undefined;
  let restoreSource = () => {};
  const folderEls = Array.from(
    document.querySelectorAll(
      `${roleSelector(DOM_ROLE.folder)}:not([data-folder-new="true"])`
    )
  );
  let dropFoldersAreas = calculateFoldersDropAreas(folderEls);
  let dropSpacesAreas = calculateSpacesDropAreas();
  let prevSpaceDropArea: DropArea | undefined = undefined;
  let dropArea: DropArea | undefined = undefined;
  const draggingFolderId = getFolderId(targetRoot);
  let targetInsertBeforeFolderId: number | undefined;
  let lastSelectedSpaceId: number | undefined;

  const clearDropIndicator = () => {
    removeFolderDropIndicator(dropIndicator);
    dropIndicator = undefined;
  };

  const onViewportScrolled = () => {
    const folderEls = Array.from(
      document.querySelectorAll(
        `${roleSelector(DOM_ROLE.folder)}:not([data-folder-new="true"])`
      )
    );
    dropFoldersAreas = calculateFoldersDropAreas(
      folderEls.filter((folderEl) => folderEl !== targetRoot),
    );
  };

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${
        e.clientY + "px"
      })`;

      const spaceDropArea = getOverlappedSpaceDropArea(dropSpacesAreas, e);

      if (spaceDropArea) {
        if (spaceDropArea !== prevSpaceDropArea) {
          prevSpaceDropArea = spaceDropArea;
          config.onChangeSpace(spaceDropArea.objectId);
          lastSelectedSpaceId = spaceDropArea.objectId;
          requestAnimationFrame(onViewportScrolled); // to recalculate dropFoldersAreas
        }
        clearDropIndicator();
        dropArea = undefined;
      } else {
        prevSpaceDropArea = undefined;
        dropArea = getOverlappedDropArea(dropFoldersAreas, e);
        if (dropArea) {
          const insertBefore =
            e.clientX < dropArea.rect.left + dropArea.rect.width / 2;
          targetInsertBeforeFolderId = calculateTargetInsertBeforeFolderId(
            dropFoldersAreas,
            dropArea,
            insertBefore
          );

          if (dropArea.objectId !== draggingFolderId) {
            dropIndicator ??= createFolderDropIndicator();
            placeFolderDropIndicator(dropIndicator, dropArea, insertBefore);
          } else {
            clearDropIndicator();
          }
        } else {
          clearDropIndicator();
        }
      }

      setScrollByDummyClientY(e.clientY);
    } else {
      if (mouseMoved) {
        if (!config.onDragStarted()) {
          unsubscribeEvents();
          return;
        }

        //create dummy
        dummy = createFolderDummy(targetRoot, mouseDownEvent);
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${
          e.clientY + "px"
        })`;
        restoreSource = setDragSourceHidden([targetRoot]);
        dropFoldersAreas = calculateFoldersDropAreas(
          folderEls.filter((folderEl) => folderEl !== targetRoot),
        );
        document.body.classList.add("dragging");
        document.body.append(dummy);
        onMouseMove(e, true);
      }
    }
  };
  const onMouseUp = () => {
    if (dummy) {
      document.body.classList.remove("dragging");
      dummy.remove();
      clearDropIndicator();
      restoreSource();
      if (dropArea) {
        config.onDrop(
          draggingFolderId,
          lastSelectedSpaceId,
          targetInsertBeforeFolderId
        );
      } else {
        config.onCancel();
      }
    }
  };

  const unsubscribeEvents = subscribeMouseEvents(
    mouseDownEvent,
    onMouseMove,
    onMouseUp,
    onViewportScrolled
  );
  return unsubscribeEvents;
}
