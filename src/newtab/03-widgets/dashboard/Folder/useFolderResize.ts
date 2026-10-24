import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, RefObject } from "react";

type FolderResizeOptions = {
  folderId: number;
  columnSpan: number;
  availableColumns: number;
  collapsed: boolean;
  rootRef: RefObject<HTMLDivElement>;
  onCommit: (columnSpan: number) => void;
};

export function useFolderResize(options: FolderResizeOptions) {
  const latest = useRef(options);
  latest.current = options;
  const [previewColumnSpan, setPreviewColumnSpan] = useState<number>();
  const cancelRef = useRef<((updateState?: boolean) => void) | undefined>();

  useEffect(() => () => cancelRef.current?.(false), []);
  useEffect(() => {
    cancelRef.current?.();
  }, [options.folderId, options.collapsed]);

  const onMouseDown = useCallback((event: MouseEvent<HTMLElement>) => {
    const { collapsed, rootRef, availableColumns, columnSpan } = latest.current;
    if (collapsed || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    cancelRef.current?.();

    const grid = rootRef.current?.parentElement;
    if (!grid) return;
    const maxSpan = Math.max(1, availableColumns);
    const width = grid.clientWidth || grid.getBoundingClientRect().width;
    const gap = Number.parseFloat(window.getComputedStyle(grid).columnGap) || 0;
    const step = (width + gap) / maxSpan;
    if (!Number.isFinite(step) || step <= 0) return;

    const startSpan = clamp(columnSpan, maxSpan);
    const startX = event.clientX;
    let currentSpan = startSpan;
    let finished = false;
    setPreviewColumnSpan(startSpan);
    document.body.classList.add("folder-resizing");

    const cancel = (updateState = true) => {
      if (finished) return;
      finished = true;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onFinish);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("blur", onBlur);
      document.body.classList.remove("folder-resizing");
      cancelRef.current = undefined;
      if (updateState) setPreviewColumnSpan(undefined);
    };
    const onMove = (moveEvent: globalThis.MouseEvent) => {
      currentSpan = clamp(startSpan + Math.round((moveEvent.clientX - startX) / step), maxSpan);
      setPreviewColumnSpan(currentSpan);
    };
    const onFinish = () => {
      if (finished) return;
      cancel();
      if (currentSpan !== startSpan) latest.current.onCommit(currentSpan);
    };
    const onEscape = (keyEvent: globalThis.KeyboardEvent) => {
      if (keyEvent.key !== "Escape") return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      cancel();
    };
    const onBlur = () => cancel();

    cancelRef.current = cancel;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onFinish);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("blur", onBlur);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      if (cancelRef.current) {
        event.preventDefault();
        event.stopPropagation();
        cancelRef.current();
      }
      return;
    }
    const { collapsed, availableColumns, columnSpan, onCommit } = latest.current;
    if (collapsed || cancelRef.current) return;
    const maxSpan = Math.max(1, availableColumns);
    const currentSpan = clamp(columnSpan, maxSpan);
    let nextSpan: number;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        nextSpan = currentSpan - 1;
        break;
      case "ArrowRight":
      case "ArrowUp":
        nextSpan = currentSpan + 1;
        break;
      case "Home":
        nextSpan = 1;
        break;
      case "End":
        nextSpan = maxSpan;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    nextSpan = clamp(nextSpan, maxSpan);
    if (nextSpan !== currentSpan) onCommit(nextSpan);
  }, []);

  return { previewColumnSpan, isResizing: previewColumnSpan !== undefined, onMouseDown, onKeyDown };
}

function clamp(span: number, maxSpan: number): number {
  return Math.max(1, Math.min(span, maxSpan));
}
