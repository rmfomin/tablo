import React, { useEffect } from "react";
import {
  getSelectedItemsIds,
  unselectAllItems,
} from "@/newtab/helpers/selectionUtils";
import { useDashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import { isSomeModalOpened } from "@/newtab/components/common/Modal/Modal";
import { isTargetInputOrTextArea } from "@/newtab/helpers/utils";

export const KeyboardAndMouseManager = React.memo((p: { search: string }) => {
  const deleteFolderItems = useDashboardStore((state) => state.deleteFolderItems);
  const undo = useDashboardStore((state) => state.undo);
  const setCurrentSpace = useDashboardStore((state) => state.selectSpace);
  const spaces = useDashboardStore((state) => state.spaces);
  const showNotification = useUiStore((state) => state.showNotification);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isSomeModalOpened()) {
        // disabling hotkeys when any Modal open
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
        (document.querySelector("input.search") as HTMLElement).focus();
        e.preventDefault();
        return;
      }

      if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
        undo();
        return;
      }

      if (document.activeElement === document.body) {
        if (e.code === "ArrowDown") {
          (document.querySelector("input.search") as HTMLElement).focus();
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
  }, [p.search, deleteFolderItems, undo, setCurrentSpace, spaces, showNotification]);
  return null;
});
