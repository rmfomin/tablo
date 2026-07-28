import { RefObject, useEffect, useRef, useState } from "react";
import {
  normalizeSelectionRect,
  resolveAreaSelection,
  type SelectionCandidate,
  type SelectionRect,
} from "@/newtab/feature/selection/areaSelection";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";

const DRAG_THRESHOLD = 3;

export function collectAreaSelectionCandidates(
  bookmarkElements: HTMLElement[],
  groupHeaderElements: HTMLElement[],
): SelectionCandidate[] {
  const bookmarks = bookmarkElements.map((element) => {
    const groupElement = element.closest(
      roleSelector(DOM_ROLE.folderGroup),
    ) as HTMLElement | null;
    const rect = element.getBoundingClientRect();
    return {
      id: Number(element.dataset.id),
      groupId: groupElement ? Number(groupElement.dataset.groupId) : undefined,
      rect: toSelectionRect(rect),
    };
  });
  const groupHeaders = groupHeaderElements.map((element) => ({
    id: Number(element.dataset.id),
    groupId: Number(element.dataset.id),
    rect: toSelectionRect(element.getBoundingClientRect()),
  }));

  return [...bookmarks, ...groupHeaders];
}

export function useAreaSelection(p: {
  containerRef: RefObject<HTMLElement>;
  setSelectedItemIds: (itemIds: number[]) => void;
  clearSelectedItemIds: () => void;
}) {
  const [selectionRect, setSelectionRect] = useState<SelectionRect>();
  const cleanupRef = useRef<() => void>();

  useEffect(() => () => cleanupRef.current?.(), []);

  function onMouseDown(event: React.MouseEvent): boolean {
    const container = p.containerRef.current;
    const target = event.target as HTMLElement;
    if (!container || event.button !== 0 || !container.contains(target)) {
      return false;
    }
    if (
      target.closest(
        `${roleSelector(DOM_ROLE.folderItem)}, ${roleSelector(
          DOM_ROLE.groupHeader,
        )}, .draggable-folder, input, textarea, button, .dropdown-menu, .modal-wrapper`,
      )
    ) {
      return false;
    }

    const candidates = collectAreaSelectionCandidates(
      Array.from(container.querySelectorAll<HTMLElement>(roleSelector(DOM_ROLE.folderItem))),
      Array.from(container.querySelectorAll<HTMLElement>(roleSelector(DOM_ROLE.groupHeader))),
    );
    const startX = event.clientX;
    const startY = event.clientY;
    let hasMoved = false;

    const onMouseMove = (mouseEvent: MouseEvent) => {
      if (
        !hasMoved &&
        Math.hypot(mouseEvent.clientX - startX, mouseEvent.clientY - startY) <
          DRAG_THRESHOLD
      ) {
        return;
      }
      hasMoved = true;
      const clientRect = normalizeSelectionRect(
        startX,
        startY,
        mouseEvent.clientX,
        mouseEvent.clientY,
      );
      p.setSelectedItemIds(resolveAreaSelection(clientRect, candidates));
      setSelectionRect(toContentRect(clientRect, container));
    };
    const onMouseUp = () => {
      if (!hasMoved) {
        p.clearSelectedItemIds();
      }
      setSelectionRect(undefined);
      cleanup();
    };
    const cleanup = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (cleanupRef.current === cleanup) {
        cleanupRef.current = undefined;
      }
    };

    cleanupRef.current?.();
    cleanupRef.current = cleanup;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return true;
  }

  return { onMouseDown, selectionRect };
}

function toSelectionRect(rect: Pick<DOMRect, "left" | "top" | "right" | "bottom">): SelectionRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function toContentRect(
  clientRect: SelectionRect,
  container: HTMLElement,
): SelectionRect {
  const containerRect = container.getBoundingClientRect();
  const left = clientRect.left - containerRect.left + container.scrollLeft;
  const top = clientRect.top - containerRect.top + container.scrollTop;
  return {
    left,
    top,
    right: clientRect.right - containerRect.left + container.scrollLeft,
    bottom: clientRect.bottom - containerRect.top + container.scrollTop,
  };
}
