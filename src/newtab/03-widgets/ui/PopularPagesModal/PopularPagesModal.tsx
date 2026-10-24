import React, { useEffect, useMemo, useState } from "react";
import { createTab } from "@/newtab/06-shared/api/chrome/tabs";
import { getWeeklyHistoryUsage, type WeeklyHistoryItem } from "@/newtab/06-shared/api/chrome/history";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { collectBookmarksV3 } from "@/newtab/05-entities/dashboard/model/traversal";
import { createNewFolderItem, generateLocalId } from "@/newtab/05-entities/dashboard/model/itemUtils";
import { Modal } from "@/newtab/06-shared/ui/Modal/Modal";
import styles from "./PopularPagesModal.module.scss";

const MAX_POPULAR_ITEMS = 20;

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return value;
  }
}

function getPopularItems(items: WeeklyHistoryItem[], savedUrls: Set<string>): WeeklyHistoryItem[] {
  const pagesByUrl = new Map<string, WeeklyHistoryItem>();
  items.forEach((item) => {
    const key = normalizeUrl(item.url);
    if (savedUrls.has(key)) return;

    const previous = pagesByUrl.get(key);
    if (!previous) {
      pagesByUrl.set(key, item);
      return;
    }

    const latest = item.lastVisitTime > previous.lastVisitTime ? item : previous;
    pagesByUrl.set(key, {
      ...latest,
      visitsLast7Days: previous.visitsLast7Days + item.visitsLast7Days,
    });
  });
  return Array.from(pagesByUrl.values())
    .sort((left, right) => {
      const visitDifference = right.visitsLast7Days - left.visitsLast7Days;
      return visitDifference || right.lastVisitTime - left.lastVisitTime;
    })
    .slice(0, MAX_POPULAR_ITEMS);
}

export function PopularPagesModal({ onClose }: { onClose: () => void }) {
  const [historyItems, setHistoryItems] = useState<WeeklyHistoryItem[]>([]);
  const [historyStatus, setHistoryStatus] = useState<"loading" | "loaded" | "error">("loading");
  const spaces = useDashboardStore((state) => state.spaces);
  const currentSpaceId = useDashboardStore((state) => state.currentSpaceId);
  const createFolder = useDashboardStore((state) => state.createFolder);
  const createFolderItem = useDashboardStore((state) => state.createFolderItem);
  const showNotification = useUiStore((state) => state.showNotification);
  const [addingItemId, setAddingItemId] = useState<number>();
  const [targetSpaceId, setTargetSpaceId] = useState(currentSpaceId);
  const [targetFolderId, setTargetFolderId] = useState<number>();

  const savedUrls = useMemo(
    () => new Set(collectBookmarksV3(spaces).map((item) => normalizeUrl(item.url))),
    [spaces],
  );
  const popularItems = useMemo(
    () => getPopularItems(historyItems, savedUrls),
    [historyItems, savedUrls],
  );
  const lastVisitFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }), []);
  const targetSpace = spaces.find((space) => space.id === targetSpaceId);
  const targetFolders = targetSpace?.folders ?? [];

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    getWeeklyHistoryUsage(controller.signal).then((items) => {
      if (cancelled) return;
      setHistoryItems(items);
      setHistoryStatus("loaded");
    }).catch(() => {
      if (!cancelled) setHistoryStatus("error");
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  function startAdding(item: WeeklyHistoryItem) {
    setAddingItemId(item.id);
    setTargetSpaceId(currentSpaceId);
    setTargetFolderId(spaces.find((space) => space.id === currentSpaceId)?.folders[0]?.id);
  }

  function addToTablo(item: WeeklyHistoryItem) {
    if (!item.url || !item.title || !targetSpace) return;

    if (targetFolders.length > 0 && !targetFolderId) return;
    let folderId = targetFolderId;
    if (!folderId) {
      folderId = generateLocalId();
      createFolder({ id: folderId, spaceId: targetSpace.id, title: "Frequently used" });
    }

    createFolderItem({
      folderId,
      item: createNewFolderItem(item.url, item.title, item.favIconUrl),
    });
    showNotification({ message: "Page added to Tablo" });
    setAddingItemId(undefined);
  }

  let historyMessage: React.ReactNode = null;
  if (historyStatus === "loading") {
    historyMessage = <p className={styles.empty} role="status">Loading frequently used pages…</p>;
  } else if (historyStatus === "error") {
    historyMessage = <p className={styles.empty} role="alert">Unable to load browsing history.</p>;
  } else if (popularItems.length === 0) {
    historyMessage = <p className={styles.empty}>No unsaved pages visited in the last 7 days</p>;
  }

  return (
    <Modal className="modal-app modal-shortcuts" onClose={onClose}>
      <div className={`modal-no-override ${styles.root}`} role="dialog" aria-label="Frequently used pages">
        <h2>Frequently used</h2>
        {historyMessage}
        {historyStatus === "loaded" && popularItems.length > 0 && (
          <div className={styles.list}>
            {popularItems.map((item) => {
              return (
                <div className={styles.item} key={item.id}>
                  <button
                    type="button"
                    className={styles.pageButton}
                    title={item.url}
                    onClick={() => {
                      createTab({ url: item.url, active: true });
                      onClose();
                    }}
                  >
                    {item.favIconUrl ? <img src={item.favIconUrl} alt="" /> : <span className={styles.faviconPlaceholder} />}
                    <span className={styles.pageText}>
                      <span className={styles.pageTitle}>{item.title}</span>
                      <span className={styles.pageUrl}>{new URL(item.url).hostname}</span>
                      <span className={styles.pageStats}>
                        <span>{item.visitsLast7Days} {item.visitsLast7Days === 1 ? "visit" : "visits"} in 7 days</span>
                        <span>
                          Last visited: <time dateTime={new Date(item.lastVisitTime).toISOString()} title={new Date(item.lastVisitTime).toLocaleString()}>
                            {lastVisitFormatter.format(item.lastVisitTime)}
                          </time>
                        </span>
                      </span>
                    </span>
                  </button>
                  {addingItemId === item.id ? (
                    <div className={styles.addForm}>
                      <label className={styles.destinationField}>
                        <span className={styles.fieldLabel}>Space</span>
                        <span className={styles.selectControl}>
                          <select
                            value={targetSpaceId}
                            onChange={(event) => {
                              setTargetSpaceId(Number(event.target.value));
                              setTargetFolderId(spaces.find((space) => space.id === Number(event.target.value))?.folders[0]?.id);
                            }}
                          >
                            {spaces.map((space) => <option key={space.id} value={space.id}>{space.title}</option>)}
                          </select>
                        </span>
                      </label>
                      {targetFolders.length > 0 ? (
                        <label className={styles.destinationField}>
                          <span className={styles.fieldLabel}>Folder</span>
                          <span className={styles.selectControl}>
                            <select
                              value={targetFolderId ?? ""}
                              onChange={(event) => setTargetFolderId(Number(event.target.value))}
                            >
                              <option value="" disabled>Select folder</option>
                              {targetFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.title}</option>)}
                            </select>
                          </span>
                        </label>
                      ) : <span className={styles.newFolderHint}>A «Frequently used» folder will be created</span>}
                      <button
                        type="button"
                        className={styles.addButton}
                        disabled={targetFolders.length > 0 && !targetFolderId}
                        onClick={() => addToTablo(item)}
                      >Add</button>
                    </div>
                  ) : (
                    <button type="button" className={styles.actionButton} onClick={() => startAdding(item)}>Add</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
