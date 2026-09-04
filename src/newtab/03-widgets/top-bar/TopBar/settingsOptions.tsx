import {
  createTab,
  updateTab,
  removeTabs,
  getCurrentTab,
  queryTabs,
  getCurrentWindow,
  focusWindow,
  type BrowserTab,
} from "@/newtab/06-shared/api/chrome/tabs";
import React, { useRef, useState } from "react";
import { hasItemsToHighlight } from "@/newtab/04-features/bookmarks/model/bookmarkUsage";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { useChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import Switch from "react-switch";
import { importFromJsonWithCallbacks } from "@/newtab/04-features/bookmarks-import/model/dashboardImportExport";
import { onExportJson } from "@/newtab/04-features/bookmarks-export/model/dashboardExport";
import { ImportConfirmationModal } from "@/newtab/04-features/bookmarks-import/ui/ImportConfirmationModal";
import { loadFaviconUrl } from "@/newtab/06-shared/api/chrome/favicons";
import { ShortcutsModal } from "@/newtab/03-widgets/ui/ShortcutsModal/ShortcutsModal";
import { BookmarkItemV3 } from "@/newtab/05-entities/dashboard/model/types";
import cn from "clsx";
import { collectBookmarksV3 } from "@/newtab/05-entities/dashboard/model/traversal";

type OnClickOption = {
  onClick: (e: any) => void;
  title: string;
  text: string;
  hidden?: boolean;
  isFile?: boolean;
  dangerStyle?: boolean;
};
type OnToggleOption = {
  onToggle: () => void;
  value: boolean;
  title: string;
  text: string;
  hidden?: boolean;
};
type SegmentedOption<T extends string> = {
  onSelect: (value: T) => void;
  value: T;
  title: string;
  text: string;
  items: Array<{
    value: T;
    text: string;
    title?: string;
    icon?: React.ReactNode;
    buttonStyle?: (isActive: boolean) => React.CSSProperties;
  }>;
  hidden?: boolean;
};
export type OptionsConfig = Array<
  OnClickOption | OnToggleOption | SegmentedOption<any> | { separator: true }
>;

export const HelpOptions = () => {
  const spaces = useDashboardStore((state) => state.spaces);
  const currentSpaceId = useDashboardStore((state) => state.currentSpaceId);
  const updateFolderItem = useDashboardStore((state) => state.updateFolderItem);
  const showNotification = useUiStore((state) => state.showNotification);
  // const [isJoinBetaModalOpen, setJoinBetaModalOpen] = useState(false);
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  function onGithubOpen() {
    createTab({
      url: "https://github.com/",
      active: true,
    });
  }

  function showShortcutsModal() {
    setShortcutsModalOpen(true);
  }

  function invalidateFavicon(folderItem: BookmarkItemV3): Promise<void> {
    if (folderItem.url) {
      return loadFaviconUrl(folderItem.url).then((newFaviconUrl) => {
        if (newFaviconUrl !== folderItem.favIconUrl) {
          updateFolderItem(folderItem.id, { favIconUrl: newFaviconUrl });
        }
      });
    } else {
      return Promise.resolve();
    }
  }

  function minTimeoutPromise() {
    return new Promise((resolve) => setTimeout(resolve, 500));
  }

  function invalidateBrokenIcons() {
    const promises: Promise<unknown>[] = [minTimeoutPromise()];
    const currentSpace = spaces.find((space) => space.id === currentSpaceId);
    if (currentSpace) {
      promises.push(
        ...collectBookmarksV3([currentSpace]).map(invalidateFavicon)
      );
    }

    showNotification({ message: "updating...", isLoading: true });
    Promise.all(promises).then(() => {
      showNotification({ message: "Favicons are updated" });
    });
  }

  type OnClickOption = {
    onClick: (e: any) => void;
    title: string;
    text: string;
    hidden?: boolean;
    isFile?: boolean;
  };

  type OnToggleOption = {
    onToggle: () => void;
    value: boolean;
    title: string;
    text: string;
    hidden?: boolean;
  };

  const settingsOptions: Array<
    OnClickOption | OnToggleOption | { separator: true }
  > = [
    {
      onClick: showShortcutsModal,
      title: "Keyboard shortcuts",
      text: "Keyboard shortcuts",
    },
    {
      onClick: invalidateBrokenIcons,
      title:
        "Sometimes favicons are not showing, this option may help to fix it. Applied only for bookmarks in the current space.",
      text: "Reload favicons",
    },
    {
      onClick: onGithubOpen,
      title: "Open Github",
      text: "Open Github (example)",
    },
  ];

  return (
    <>
      <Options optionsConfig={settingsOptions} />

      {isShortcutsModalOpen && (
        <ShortcutsModal setOpen={setShortcutsModalOpen} />
      )}
    </>
  );
};

export const SettingsOptions = () => {
  const [importConfirmationOpen, setImportConfirmationOpen] = useState(false);
  const fileEvent = useRef(null);
  const spaces = useDashboardStore((state) => state.spaces);
  const currentSpaceId = useDashboardStore((state) => state.currentSpaceId);
  const hydrate = useDashboardStore((state) => state.hydrate);
  const showNotUsed = useUiStore((state) => state.showNotUsed);
  const setShowNotUsed = useUiStore((state) => state.setShowNotUsed);
  const showArchived = useUiStore((state) => state.showArchived);
  const setShowArchived = useUiStore((state) => state.setShowArchived);
  const showRecent = useUiStore((state) => state.showRecent);
  const setShowRecent = useUiStore((state) => state.setShowRecent);
  const openBookmarksInNewTab = useUiStore(
    (state) => state.openBookmarksInNewTab
  );
  const setOpenBookmarksInNewTab = useUiStore(
    (state) => state.setOpenBookmarksInNewTab
  );
  const hiddenFeatureIsEnabled = useUiStore(
    (state) => state.hiddenFeatureIsEnabled
  );
  const setPage = useUiStore((state) => state.setPage);
  const showNotification = useUiStore((state) => state.showNotification);
  const recentItems = useChromeRuntimeStore((state) => state.recentItems);

  function onToggleNotUsed() {
    if (showNotUsed) {
      setShowNotUsed(false);
      showNotification({ message: "Highlighting canceled" });
    } else {
      if (hasItemsToHighlight(spaces, recentItems)) {
        setShowNotUsed(true);
        showNotification({
          message: "Unused items for the past 60 days are highlighted",
        });
      } else {
        showNotification({
          message: "There are no unused items to highlight",
          isError: true,
        });
      }
    }
  }

  function onToggleHidden() {
    setShowArchived(!showArchived);
    const message = !showArchived
      ? "Hidden items are visible"
      : "Hidden items are hidden";
    showNotification({ message });
  }

  function onImportExistingBookmarks() {
    setPage("import");
  }

  function onToggleRecentVisibility() {
    setShowRecent(!showRecent);
  }

  function onToggleOpenInTheNewTab() {
    setOpenBookmarksInNewTab(!openBookmarksInNewTab);
  }

  function onImportClick(e: any) {
    fileEvent.current = e;
    setImportConfirmationOpen(true);
  }

  function onImportTypeConfirmed(opt: string) {
    setImportConfirmationOpen(false);
    if (opt === "import" && fileEvent.current) {
      importFromJsonWithCallbacks(
        fileEvent.current,
        (importedSpaces) => {
          hydrate({
            spaces: importedSpaces,
            currentSpaceId: importedSpaces[0]?.id ?? -1,
          });
        },
        (message, isError) => showNotification({ message, isError })
      );
    }
  }

  const settingsOptions: OptionsConfig = [
    {
      onToggle: onToggleNotUsed,
      value: showNotUsed,
      title:
        "Highlight not used in past 60 days to archive them. It helps to keep workspace clean.",
      text: showNotUsed ? "Unhighlight not used" : "Highlight not used",
    },
    {
      onToggle: onToggleHidden,
      value: showArchived,
      title: "You can hide unused folders and bookmarks to keep space clean",
      text: "Show hidden items",
      hidden: !hiddenFeatureIsEnabled,
    },
    {
      onToggle: onToggleRecentVisibility,
      value: showRecent,
      title:
        "Show recently closed tabs in the sidebar. When off, they appear only during search.",
      text: "Show Recent in Sidebar",
    },
    {
      onToggle: onToggleOpenInTheNewTab,
      value: !openBookmarksInNewTab,
      title:
        "You can also open bookmarks on the new tab with pressed CMD or CTRL",
      text: "Open bookmarks on the same tab",
    },
    {
      separator: true,
    },
    {
      onClick: onImportExistingBookmarks,
      title: "Import existing Chrome bookmarks into Tablo",
      text: "Import from browser bookmarks",
    },
    {
      onClick: (e) => onImportClick(e),
      title: "Open exported Tablo JSON file",
      text: "Import from JSON",
      isFile: true,
    },
    {
      onClick: () => {
        onExportJson(spaces);
      },
      title: "Export all Folders and Bookmarks to JSON file",
      text: "Export to JSON",
    },
  ];

  return (
    <>
      <Options optionsConfig={settingsOptions} />

      {importConfirmationOpen && (
        <ImportConfirmationModal onClose={onImportTypeConfirmed} />
      )}

      {/* {isOverrideModalOpen && <OverrideModal setOpen={setOverrideModalOpen} />} */}
    </>
  );
};

export const Options = (props: {
  optionsConfig: OptionsConfig | (() => OptionsConfig);
}) => {
  function isSeparator(opt: any): opt is { separator: boolean } {
    return opt.hasOwnProperty("separator");
  }

  function isToggle(opt: any): opt is OnToggleOption {
    return opt.hasOwnProperty("onToggle");
  }

  function isClick(opt: any): opt is OnClickOption {
    return opt.hasOwnProperty("onClick");
  }

  function isSegmented(opt: any): opt is SegmentedOption<string> {
    return opt.hasOwnProperty("onSelect");
  }

  const options =
    typeof props.optionsConfig === "function"
      ? props.optionsConfig()
      : props.optionsConfig;

  return (
    <>
      {options.map((option, index) => {
        if ((option as any).hidden) {
          return null;
        }

        if (isSeparator(option)) {
          return <div key={index} className="dropdown-menu__separator" />;
        } else if (isSegmented(option)) {
          return (
            <div
              key={index}
              className="dropdown-menu__segmented-row"
              title={option.title}
            >
              <span className="dropdown-menu__segmented-label">
                {option.text}
              </span>
              <div className="dropdown-menu__segmented-control">
                {option.items.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={cn("dropdown-menu__segmented-button focusable", {
                      active: item.value === option.value,
                    })}
                    title={item.title}
                    aria-label={item.text}
                    style={item.buttonStyle?.(item.value === option.value)}
                    onClick={() => option.onSelect(item.value)}
                  >
                    {item.icon ?? item.text}
                  </button>
                ))}
              </div>
            </div>
          );
        } else if (isToggle(option)) {
          return (
            <label
              key={index}
              className="dropdown-menu__button focusable"
              title={option.title}
            >
              <Switch
                className={"switch"}
                height={16}
                width={28}
                onColor={"#0066FF"}
                offColor={"#cbcbcb"}
                checkedIcon={false}
                uncheckedIcon={false}
                checked={option.value}
                onChange={option.onToggle}
              />
              <span>{option.text}</span>
            </label>
          );
        } else if (isClick(option)) {
          if (option.isFile) {
            return (
              <label
                key={index}
                className="dropdown-menu__button focusable"
                style={{ position: "relative" }}
                title={option.title}
                tabIndex={0}
              >
                <span>{option.text}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden-file-input"
                  onChange={option.onClick}
                  tabIndex={-1}
                />
              </label>
            );
          } else {
            return (
              <button
                key={index}
                className={cn("dropdown-menu__button focusable", {
                  "dropdown-menu__button--dander": option.dangerStyle,
                })}
                onClick={option.onClick}
                title={option.title}
              >
                {option.text}
              </button>
            );
          }
        }
      })}
    </>
  );
};
