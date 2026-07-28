import {
  BookmarkItemV3,
  FolderItemToCreate,
  SpaceV3,
} from "@/newtab/helpers/types";
import {
  findBookmarkItem,
  generateLocalId,
  isCustomActionBookmark,
} from "@/newtab/state/dashboard/itemUtils";

/**
 * Явная граница между DOM-обработчиком и Zustand stores.
 *
 * Раньше сюда передавался legacy dispatch и helper создавал Action-объекты.
 * Теперь caller передаёт только нужные commands из uiStore/dashboardStore.
 */
export type UiFeedbackCommands = {
  showNotification(notification: {
    message: string;
    isError?: boolean;
    isLoading?: boolean;
    button?: { text: string; onClick?: () => void };
  }): void;
  hideNotification(): void;
  setItemInEdit(itemId: number | undefined): void;
  setPage(page: "default" | "import"): void;
};

export type DashboardFolderCommands = {
  createFolder(input: {
    id: number;
    title?: string;
    color?: string;
    position?: string;
    items?: FolderItemToCreate[];
    spaceId?: number;
  }): void;
  undo(): void;
};

export function showMessage(
  message: string,
  commands: Pick<UiFeedbackCommands, "showNotification">,
  isLoading = false
): void {
  commands.showNotification({
    message: message,
    isLoading,
  });
}

export function showErrorMessage(
  errorMessage: string,
  commands: Pick<UiFeedbackCommands, "showNotification">
): void {
  commands.showNotification({
    message: errorMessage,
    isError: true,
  });
}

type CreateFolderProps = {
  title?: string;
  color?: string;
  position?: string;
  items?: FolderItemToCreate[];
  spaceId?: number;
  historyStepId?: number;
};

export function createFolderWithStat(
  commands: Pick<DashboardFolderCommands, "createFolder">,
  props: CreateFolderProps
): number {
  const newFolderId = generateLocalId();
  // historyStepId был технической деталью reducer undo. Zustand store хранит
  // snapshot сам, поэтому это поле намеренно не передаётся дальше.
  const { historyStepId: _historyStepId, ...folderProps } = props;
  commands.createFolder({ id: newFolderId, ...folderProps });
  return newFolderId;
}

export function showMessageWithUndo(
  message: string,
  commands: Pick<UiFeedbackCommands, "showNotification" | "hideNotification">
    & Pick<DashboardFolderCommands, "undo">
): void {
  commands.showNotification({
    message: message,
    button: {
      text: "Undo",
      onClick: () => {
        commands.undo();
        commands.hideNotification();
      },
    },
  });
}

export function getCanDragChecker(
  search: string,
  commands: Pick<UiFeedbackCommands, "showNotification">
): () => boolean {
  return () => {
    if (search) {
      commands.showNotification({
        message: "Sorting is unavailable in search",
      });
      return false;
    } else {
      return true;
    }
  };
}

export function clickFolderItem(
  targetId: number,
  appState: { spaces: SpaceV3[]; tabs: chrome.tabs.Tab[] },
  commands: Pick<UiFeedbackCommands, "showNotification" | "setItemInEdit" | "setPage">,
  openInNewTab: boolean,
  openBookmarksInNewTab: boolean
) {
  const targetItem = findBookmarkItem(appState, targetId);
  if (targetItem?.isSection) {
    onRenameSection(targetItem);
  } else if (isCustomActionBookmark(targetItem) && targetItem?.url) {
    executeCustomAction(targetItem.url);
  } else if (targetItem) {
    if (!targetItem.url) {
      showErrorMessage("Bookmark URL is empty", commands);
      return;
    }

    if (openInNewTab) {
      // open in new tab
      chrome.tabs.create({ url: targetItem.url, active: false });
      //TODO fix bug of not updating bold items when move to new tab in new window
    } else {
      // open in the same tab or switch to already opened
      const tab = appState.tabs.find((t) => t.url === targetItem.url);
      if (tab && tab.id) {
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
      } else {
        chrome.tabs.getCurrent((t) => {
          if (openBookmarksInNewTab) {
            chrome.tabs.create({ url: targetItem.url, active: true });
          } else {
            chrome.tabs.update(t?.id!, { url: targetItem.url });
          }
        });
      }
    }
  }

  function onRenameSection(targetItem: BookmarkItemV3) {
    commands.setItemInEdit(targetItem.id);
  }

  function executeCustomAction(actionUrl: string): void {
    if (actionUrl.split("//")[1] === "import-bookmarks") {
      commands.setPage("import");
    }
  }
}
