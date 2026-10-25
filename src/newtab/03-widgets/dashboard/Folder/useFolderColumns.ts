import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { DOM_ROLE, roleSelector } from "@/newtab/06-shared/lib/dom/roles";
import { distributeFolderItems, type FolderColumnMeasurements } from "./distributeFolderItems";
import type { FolderDisplayItem } from "./getFolderDisplayItems";

export function useFolderColumns(
  items: FolderDisplayItem[],
  columnCount: number,
  rootRef: RefObject<HTMLDivElement>,
  headerRef: RefObject<HTMLHeadingElement>,
) {
  const [measurements, setMeasurements] = useState<FolderColumnMeasurements>({ folderHeaderHeight: 66 });
  const dragging = useRef(false);
  const frame = useRef<number>();
  const measureRef = useRef<() => void>(() => {});

  measureRef.current = () => {
    const root = rootRef.current;
    const header = headerRef.current;
    if (!root || !header || dragging.current || document.body.classList.contains("dragging")) return;
    const active = document.activeElement;
    if (root.contains(active) && active?.matches("input, textarea")) return;

    const itemHeights = new Map<number, number>();
    root.querySelectorAll<HTMLElement>(roleSelector(DOM_ROLE.folderItem)).forEach((element) => {
      if (element.closest('[data-dad-preview="true"]')) return;
      const wrapper = element.parentElement!;
      const height = wrapper.getBoundingClientRect().height;
      if (height <= 0) return;
      const style = getComputedStyle(wrapper);
      itemHeights.set(Number(element.dataset.id), Math.ceil(height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)));
    });
    const groupHeaderHeights = new Map<number, number>();
    root.querySelectorAll<HTMLElement>(roleSelector(DOM_ROLE.groupHeader)).forEach((element) => {
      if (element.closest('[data-dad-preview="true"]')) return;
      const height = element.getBoundingClientRect().height;
      if (height <= 0) return;
      const margin = parseFloat(getComputedStyle(element.parentElement!).marginTop) || 0;
      groupHeaderHeights.set(Number(element.dataset.groupId), Math.ceil(height + margin));
    });
    const headerHeight = header.getBoundingClientRect().height;
    const gap = parseFloat(getComputedStyle(root).getPropertyValue("--container-gap")) || 18;
    setMeasurements((previous) => {
      const nextHeaderHeight = headerHeight > 0 ? Math.ceil(headerHeight + gap) : previous.folderHeaderHeight;
      const itemsChanged = Array.from(itemHeights).some(([id, height]) => previous.itemHeights?.get(id) !== height);
      const groupsChanged = Array.from(groupHeaderHeights).some(([id, height]) => previous.groupHeaderHeights?.get(id) !== height);
      if (!itemsChanged && !groupsChanged && nextHeaderHeight === previous.folderHeaderHeight) return previous;
      return {
        folderHeaderHeight: nextHeaderHeight,
        itemHeights: new Map([...previous.itemHeights ?? [], ...itemHeights]),
        groupHeaderHeights: new Map([...previous.groupHeaderHeights ?? [], ...groupHeaderHeights]),
      };
    });
  };

  useLayoutEffect(() => {
    measureRef.current();
  }, [items, columnCount, rootRef, headerRef]);
  useLayoutEffect(() => {
    const schedule = () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        frame.current = undefined;
        measureRef.current();
      });
    };
    const onDragState = (event: Event) => {
      dragging.current = Boolean((event as CustomEvent<boolean>).detail);
      if (!dragging.current) schedule();
    };
    const observer = new ResizeObserver(schedule);
    if (rootRef.current) observer.observe(rootRef.current);
    if (headerRef.current) observer.observe(headerRef.current);
    document.addEventListener("tablo-drag-state", onDragState);
    rootRef.current?.addEventListener("focusout", schedule);
    const root = rootRef.current;
    return () => {
      observer.disconnect();
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      document.removeEventListener("tablo-drag-state", onDragState);
      root?.removeEventListener("focusout", schedule);
    };
  }, [rootRef, headerRef]);

  const columns = useMemo(
    () => distributeFolderItems(items, columnCount, measurements),
    [items, columnCount, measurements],
  );
  return { columns, headerHeight: measurements.folderHeaderHeight };
}
