import React, { useEffect, useRef, useState } from "react";
import cn from "clsx";
import { createTabGroup, type TabGroupColor } from "@/newtab/06-shared/api/chrome/tabs";
import type { QuickGroupV3 } from "@/newtab/05-entities/dashboard/model/types";
import { DropdownMenu, getPointerPosition } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { DropdownMenuIcon } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenuIcon";
import type { Point } from "@/newtab/06-shared/lib/math";
import WrenchIcon from "./wrench.svg";
import FolderKanbanIcon from "./folder-kanban.svg";
import { startQuickGroupUrlDrag } from "./startQuickGroupUrlDrag";
import styles from "./Bookmarks.module.scss";

const TAB_GROUP_COLORS: Array<{
  value: TabGroupColor;
  label: string;
  preview: string;
}> = [
  { value: "grey", label: "Grey", preview: "#5f6368" },
  { value: "blue", label: "Blue", preview: "#1a73e8" },
  { value: "red", label: "Red", preview: "#d93025" },
  { value: "yellow", label: "Yellow", preview: "#f9ab00" },
  { value: "green", label: "Green", preview: "#188038" },
  { value: "pink", label: "Pink", preview: "#d01884" },
  { value: "purple", label: "Purple", preview: "#a142f4" },
  { value: "cyan", label: "Cyan", preview: "#007b83" },
  { value: "orange", label: "Orange", preview: "#fa903e" },
];

type TabGroupConfig = QuickGroupV3;

function createTabGroupConfig(): QuickGroupV3 {
  return { title: "", color: "blue", urls: [""] };
}

function getTabGroupTitle(config: TabGroupConfig): string {
  const title = config.title.trim();
  if (title) return title;

  const domains = config.urls
    .map((url) => {
      const value = url.trim();
      if (!value) return "";

      try {
        const urlWithProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
          ? value
          : `https://${value}`;
        return new URL(urlWithProtocol).hostname.replace(/^www\./i, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return domains.join(" | ") || "New group";
}

function moveTabGroupUrl(
  urls: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (fromIndex === toIndex || !urls[fromIndex]?.trim()) {
    return urls;
  }

  const nextUrls = [...urls];
  const [movedUrl] = nextUrls.splice(fromIndex, 1);
  const lastIndex = nextUrls.length - 1;
  const targetIndex =
    lastIndex >= 0 && !nextUrls[lastIndex].trim()
      ? Math.min(toIndex, lastIndex)
      : toIndex;
  nextUrls.splice(targetIndex, 0, movedUrl);
  return nextUrls;
}

export function QuickGroups({ configs, currentSpaceId, onChange, showNotification }: {
  configs: QuickGroupV3[];
  currentSpaceId: number;
  onChange: (configs: QuickGroupV3[]) => void;
  showNotification: (notification: { message: string; isError?: boolean }) => void;
}) {
  const [openTabGroupMenuIndex, setOpenTabGroupMenuIndex] = useState<number>();
  const [tabGroupMenuPosition, setTabGroupMenuPosition] = useState<Point>();
  const urlDragCleanupRef = useRef<() => void>();
  const tabGroupConfigs = configs;

  async function openTabGroup(config: TabGroupConfig) {
    const urls = config.urls.map((url) => url.trim()).filter(Boolean);
    if (urls.length === 0) {
      showNotification({
        message: "Add at least one URL to the tab group",
        isError: true,
      });
      return;
    }

    try {
      await createTabGroup(urls, config.title, config.color);
      setOpenTabGroupMenuIndex(undefined);
    } catch (error) {
      console.error("Failed to open the tab group", error);
      showNotification({
        message:
          error instanceof Error
            ? `Could not open the tab group: ${error.message}`
            : "Could not open the tab group",
        isError: true,
      });
    }
  }

  function toggleTabGroupMenu(
    index: number,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    setTabGroupMenuPosition(getPointerPosition(event));
    setOpenTabGroupMenuIndex((openIndex) =>
      openIndex === index ? undefined : index,
    );
  }

  function openTabGroupMenuFromContext(
    index: number,
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setTabGroupMenuPosition(getPointerPosition(event));
    setOpenTabGroupMenuIndex(index);
  }

  function updateTabGroupConfig(
    index: number,
    update: (config: TabGroupConfig) => TabGroupConfig,
  ) {
    onChange(
      tabGroupConfigs.map((config, configIndex) =>
        configIndex === index ? update(config) : config,
      ),
    );
  }

  function addTabGroup() {
    onChange([...tabGroupConfigs, createTabGroupConfig()]);
  }

  function removeTabGroup(index: number) {
    onChange(
      tabGroupConfigs.filter(
        (_, configIndex) => configIndex !== index,
      ),
    );
    setOpenTabGroupMenuIndex(undefined);
  }

  function updateTabGroupUrl(groupIndex: number, urlIndex: number, value: string) {
    updateTabGroupConfig(groupIndex, (config) => ({
      ...config,
      urls: (() => {
        const urls = config.urls.map((url, index) =>
          index === urlIndex ? value : url,
        );
        if (urlIndex === urls.length - 1 && value.trim()) {
          urls.push("");
        }
        return urls;
      })(),
    }));
  }

  function moveTabGroupUrlInConfig(
    groupIndex: number,
    fromIndex: number,
    toIndex: number,
  ) {
    updateTabGroupConfig(groupIndex, (config) => ({
      ...config,
      urls: moveTabGroupUrl(config.urls, fromIndex, toIndex),
    }));
  }

  function startUrlDrag(
    event: React.MouseEvent<HTMLButtonElement>,
    groupIndex: number,
    urlIndex: number,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    urlDragCleanupRef.current?.();
    urlDragCleanupRef.current = startQuickGroupUrlDrag(event, (toIndex) => {
      moveTabGroupUrlInConfig(groupIndex, urlIndex, toIndex);
    });
  }

  useEffect(() => {
    return () => urlDragCleanupRef.current?.();
  }, [currentSpaceId, openTabGroupMenuIndex]);

  return (
    <>
      <button
        type="button"
        className={styles.addGroupButton}
        title="Add group"
        aria-label="Add group"
        onClick={addTabGroup}
      >
        <FolderKanbanIcon />
      </button>
      {tabGroupConfigs.map((config, groupIndex) => {
        const buttonTitle = getTabGroupTitle(config);
        const isMenuOpen = openTabGroupMenuIndex === groupIndex;

        return (
          <div className={styles.groupActions} key={groupIndex}>
            <div
              className={cn(styles.groupButton, {
                [styles.groupButtonActive]: isMenuOpen,
              })}
              onContextMenu={(event) =>
                openTabGroupMenuFromContext(groupIndex, event)
              }
            >
              <button
                type="button"
                className={styles.groupTitleButton}
                onClick={() => openTabGroup(config)}
              >
                {buttonTitle}
              </button>
              <button
                type="button"
                className={styles.groupSettingsButton}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                title={`${buttonTitle} settings`}
                aria-label={`${buttonTitle} settings`}
                onClick={(event) => toggleTabGroupMenu(groupIndex, event)}
              >
                <WrenchIcon />
              </button>
            </div>
            {isMenuOpen ? (
              <DropdownMenu
                width={300}
                absPosition={tabGroupMenuPosition}
                className={cn("dropdown-menu--context", styles.groupOptionsMenu)}
                onClose={() => setOpenTabGroupMenuIndex(undefined)}
              >
                <div className={styles.groupColorOptions}>
                  {TAB_GROUP_COLORS.map((color) => {
                    const isSelected = color.value === config.color;
                    return (
                      <button
                        key={color.value}
                        type="button"
                        className={cn(styles.groupColorOption, {
                          [styles.groupColorOptionSelected]: isSelected,
                        })}
                        title={color.label}
                        aria-label={color.label}
                        aria-pressed={isSelected}
                        onClick={() =>
                          updateTabGroupConfig(groupIndex, (current) => ({
                            ...current,
                            color: color.value,
                          }))
                        }
                      >
                        <span style={{ backgroundColor: color.preview }} />
                      </button>
                    );
                  })}
                </div>
                <label className="input-label">
                  <span className="input-label__text">Title</span>
                  <textarea
                    className="focusable"
                    autoFocus
                    rows={1}
                    aria-label="Title"
                    value={config.title}
                    onChange={(event) =>
                      updateTabGroupConfig(groupIndex, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className={styles.groupUrls}>
                  {config.urls.map((url, urlIndex) => (
                    <div
                      className={styles.groupUrlRow}
                      key={urlIndex}
                    >
                      <button
                        type="button"
                        className={styles.groupUrlDragHandle}
                        disabled={!url.trim()}
                        aria-label={`Move URL ${urlIndex + 1}`}
                        title="Drag to reorder"
                        onMouseDown={(event) =>
                          startUrlDrag(event, groupIndex, urlIndex)
                        }
                      >
                        ⋮⋮
                      </button>
                      <label className="input-label">
                        <span className="input-label__text">URL</span>
                        <textarea
                          className="focusable"
                          rows={1}
                          aria-label={`URL ${urlIndex + 1}`}
                          value={url}
                          onChange={(event) =>
                            updateTabGroupUrl(
                              groupIndex,
                              urlIndex,
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="dropdown-menu__separator" />
                <button
                  type="button"
                  className="dropdown-menu__button dropdown-menu__button--dander focusable"
                  onClick={() => removeTabGroup(groupIndex)}
                >
                  <DropdownMenuIcon name="remove" />
                  Delete group
                </button>
              </DropdownMenu>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
