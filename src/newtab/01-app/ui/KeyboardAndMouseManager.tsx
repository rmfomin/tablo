import React, { useEffect } from "react";
import {
  getSelectedItemsIds,
  unselectAllItems,
} from "@/newtab/01-app/model/selection";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { isSomeModalOpened } from "@/newtab/06-shared/ui/Modal/Modal";
import { isTargetInputOrTextArea } from "@/newtab/06-shared/lib/dom/html";

export const KeyboardAndMouseManager = React.memo((p: { search: string }) => {
  const deleteFolderItems = useDashboardStore(
    (state) => state.deleteFolderItems
  );
  const undo = useDashboardStore((state) => state.undo);
  const setCurrentSpace = useDashboardStore((state) => state.selectSpace);
  const spaces = useDashboardStore((state) => state.spaces);
  const showNotification = useUiStore((state) => state.showNotification);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  useEffect(() => {
    const focusSearch = () => {
      const input = document.querySelector<HTMLInputElement>("input.search");
      if (input) {
        input.focus();
        return;
      }
      setSidebarCollapsed(false);
      requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>("input.search")?.focus()
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isSomeModalOpened()) {
        // disabling hotkeys when any Modal open
        return;
      }

      if (e.code === "Escape") {
        // DropdownMenu listens for Escape itself. Let it close first instead
        // of moving focus to the search field in the same key press.
        if (document.querySelector(".dropdown-menu, .sub-menu")) {
          return;
        }

        if (
          document.activeElement &&
          isTargetInputOrTextArea(document.activeElement)
        ) {
          return;
        }

        focusSearch();
        e.preventDefault();
        return;
      }

      if (
        document.activeElement &&
        isTargetInputOrTextArea(document.activeElement)
      ) {
        return;
      }

      const selectedItemIds = getSelectedItemsIds();
      if (selectedItemIds.length > 0) {
        if (e.code === "Backspace" || e.code === "Delete") {
          deleteFolderItems(selectedItemIds);
          unselectAllItems();
          showNotification({ message: "Bookmark has been deleted" });
          return;
        }
      }

      if (e.code === "KeyF" && (e.ctrlKey || e.metaKey)) {
        focusSearch();
        e.preventDefault();
        return;
      }

      if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
        undo();
        return;
      }

      if (document.activeElement === document.body) {
        if (e.code === "ArrowDown") {
          focusSearch();
          return;
        }

        if (e.code.startsWith("Digit")) {
          if (e.ctrlKey || e.altKey) {
            const spaceIndex = parseInt(e.code.at(5) ?? "", 10);
            if (spaceIndex > 0 && spaceIndex < 10) {
              setCurrentSpace(spaces[spaceIndex - 1]?.id ?? -1);
              return;
            }
          }
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [
    p.search,
    deleteFolderItems,
    undo,
    setCurrentSpace,
    spaces,
    showNotification,
    setSidebarCollapsed,
  ]);
  return null;
});
