import type React from "react";
import {
  createDropPreview,
  createTabDummy,
  removeDropPreview,
  setDragSourceHidden,
} from "@/newtab/04-features/dragging/model/dragAndDrop";
import { notifyDragState, subscribeMouseEvents } from "@/newtab/04-features/dragging/model/dragAndDropUtils";
import styles from "./Bookmarks.module.scss";

export function startQuickGroupUrlDrag(
  event: React.MouseEvent<HTMLButtonElement>,
  onDrop: (index: number) => void,
): () => void {
  const source = event.currentTarget.parentElement!;
  const container = source.parentElement!;
  const menu = container.closest<HTMLElement>(".dropdown-menu")!;
  const minHeight = container.style.minHeight;
  let dummy: HTMLElement | undefined;
  let preview: HTMLElement | undefined;
  let restoreSource = () => {};
  let targetIndex: number | undefined;
  let lastPointer: MouseEvent;
  let cleanedUp = false;
  let scrollFrame: number | undefined;
  let rows: { element: HTMLElement; centerY: number }[] = [];

  function updatePreview(e: MouseEvent) {
    if (!dummy || !preview) return;
    lastPointer = e;
    dummy.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    preview.remove();

    const rect = container.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const isInside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= Math.max(rect.top, menuRect.top) &&
      e.clientY <= Math.min(rect.bottom, menuRect.bottom);
    targetIndex = undefined;
    if (!isInside) return;

    const index = rows.findIndex((row) => e.clientY - rect.top < row.centerY);
    const lastRowIsEmpty =
      rows.at(-1)?.element.querySelector("textarea")?.value.trim() === "";
    const maxIndex = rows.length - Number(lastRowIsEmpty);
    targetIndex = Math.min(index === -1 ? rows.length : index, maxIndex);
    container.insertBefore(preview, rows[targetIndex]?.element ?? null);
  }

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    unsubscribe();
    document.removeEventListener("keydown", onKeyDown, true);
    menu.removeEventListener("scroll", onScroll);
    window.removeEventListener("blur", cleanup);
    if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
    dummy?.remove();
    if (preview) removeDropPreview([preview]);
    restoreSource();
    container.style.minHeight = minHeight;
    document.body.classList.remove("dragging");
    if (dummy) notifyDragState(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      cleanup();
    }
  }

  function onScroll() {
    if (lastPointer) updatePreview(lastPointer);
  }

  function scrollMenu() {
    if (lastPointer) {
      const rect = menu.getBoundingClientRect();
      if (
        lastPointer.clientX >= rect.left && lastPointer.clientX <= rect.right &&
        lastPointer.clientY >= rect.top && lastPointer.clientY <= rect.bottom
      ) {
        const distanceToTop = lastPointer.clientY - rect.top;
        const distanceToBottom = rect.bottom - lastPointer.clientY;
        if (distanceToTop < 32) {
          menu.scrollTop -= (32 - distanceToTop) / 3;
        } else if (distanceToBottom < 32) {
          menu.scrollTop += (32 - distanceToBottom) / 3;
        }
      }
    }
    scrollFrame = requestAnimationFrame(scrollMenu);
  }

  const unsubscribe = subscribeMouseEvents(
    event,
    (e, moved) => {
      if (!moved) return;
      if (!dummy) {
        const rect = container.getBoundingClientRect();
        rows = Array.from(container.children)
          .filter((child): child is HTMLElement =>
            child instanceof HTMLElement && child !== source,
          )
          .map((element) => {
            const rowRect = element.getBoundingClientRect();
            return { element, centerY: rowRect.top + rowRect.height / 2 - rect.top };
          });
        dummy = createTabDummy([source], event, false);
        dummy.style.width = `${source.getBoundingClientRect().width}px`;
        dummy.classList.add(
          "dropdown-menu--context",
          styles.groupOptionsMenu,
          styles.groupUrlDragDummy,
        );
        preview = createDropPreview([source])[0];
        container.style.minHeight = `${rect.height}px`;
        restoreSource = setDragSourceHidden([source]);
        document.body.append(dummy);
        document.body.classList.add("dragging");
        notifyDragState(true);
        scrollFrame = requestAnimationFrame(scrollMenu);
      }
      updatePreview(e);
    },
    (e) => {
      updatePreview(e);
      const index = targetIndex;
      cleanup();
      if (index !== undefined) onDrop(index);
    },
  );
  document.addEventListener("keydown", onKeyDown, true);
  menu.addEventListener("scroll", onScroll);
  window.addEventListener("blur", cleanup);
  return cleanup;
}
