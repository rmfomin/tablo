import React, { useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import {
  BookmarksAsPlainList,
  CustomBookmarkTreeNode,
  getBrowserBookmarksForImport,
  importBrowserBookmarksWithCallback,
  PlainListRecord,
} from "@/newtab/06-shared/api/chrome/bookmarks";
import { RecentItem } from "@/newtab/06-shared/api/chrome/history";
import { Modal } from "@/newtab/06-shared/ui/Modal/Modal";

const recordToTitle = (rec: PlainListRecord) => {
  const res = rec.breadcrumbs.map((r) => r.title).join(" / ");
  return res.length > 0 ? `${res} / ` : "";
};

const BookmarkList = (p: {
  recentItems: RecentItem[];
  onClose: () => void;
  onBack?: () => void;
}) => {
  const createFolder = useDashboardStore((state) => state.createFolder);
  const showNotification = useUiStore((state) => state.showNotification);
  const recordsRefs = useRef<HTMLInputElement[]>([]);
  const [records, setPlainRecords] = useState<BookmarksAsPlainList>([]);

  useEffect(() => {
    getBrowserBookmarksForImport(
      (plain) => {
        setPlainRecords(plain);
      },
      p.recentItems,
      () => showNotification({ message: "No browser bookmarks found", isError: true }),
    );
  }, [p.recentItems, showNotification]);

  const handleFolderCheckChange = (recIndex: number, isChecked: boolean) => {
    const updatedRecords = records.map<PlainListRecord>(
      (rec: PlainListRecord, index: number) => {
        if (index === recIndex) {
          return {
            ...rec,
            folder: {
              ...rec.folder,
              checked: isChecked,
              children: rec.folder.children?.map((item) => ({
                ...item,
                checked: isChecked,
              })),
            },
          };
        } else {
          return rec;
        }
      },
    );

    setPlainRecords(updatedRecords);
  };

  const handleItemCheckChange = (
    recIndex: number,
    itemIndex: number,
    isChecked: boolean,
  ) => {
    const updatedRecords = records.map<PlainListRecord>((rec, rIndex) => {
      if (rIndex === recIndex) {
        const updatedChildren = rec.folder.children?.map((item, iIndex) => {
          if (iIndex === itemIndex) {
            return { ...item, checked: isChecked };
          }
          return item;
        });
        const folderChecked =
          updatedChildren?.some((item) => item.checked) ?? false;
        return {
          ...rec,
          folder: {
            ...rec.folder,
            checked: folderChecked,
            children: updatedChildren,
          },
        };
      } else {
        return rec;
      }
    });

    setPlainRecords(updatedRecords);
  };

  useEffect(() => {
    records.forEach((rec, index) => {
      const allChecked =
        rec.folder.children?.every((item) => item.checked) ?? false;
      const someChecked =
        rec.folder.children?.some((item) => item.checked) ?? false;

      const folderCheckbox = recordsRefs.current[index];
      if (folderCheckbox) {
        folderCheckbox.indeterminate = someChecked && !allChecked;
      }
    });
  }, [records]);

  recordsRefs.current = records.map(
    (_, i) => recordsRefs.current[i] ?? React.createRef(),
  );

  let selectedBookmarksCount = 0;
  records.forEach((rec) => {
    selectedBookmarksCount +=
      rec.folder.children?.reduce<number>(
        (acc, item) => (item.checked ? acc + 1 : acc),
        0,
      ) ?? 0;
  });

  const onImport = () => {
    importBrowserBookmarksWithCallback(records, false, createFolder);
    p.onClose();
  };

  const onImportRecent = () => {
    let mostVisitedNum = 0;
    records.forEach((rec) => {
      rec.folder.children?.forEach((item) => {
        if (item.mostVisited) {
          mostVisitedNum++;
          rec.folder.checked = true;
          item.checked = true;
        }
      });
    });
    if (mostVisitedNum === 0) {
      showNotification({ message: 'Sorry, "Recently visited" bookmarks not found' });
    } else {
      onImport();
    }
  };

  const onSelectAll = () => {
    const newRecords = records.map((rec) => {
      return {
        ...rec,
        folder: {
          ...rec.folder,
          checked: true,
          children: rec.folder.children?.map((item) => {
            return {
              ...item,
              checked: true,
            };
          }),
        },
      };
    });
    setPlainRecords(newRecords);
  };

  const onImportAll = () => {
    importBrowserBookmarksWithCallback(records, true, createFolder);
    p.onClose();
  };

  return (
    <div className="bookmark-import-modal">
      <header className="bookmark-import-header">
        <h2>Importing browser bookmarks</h2>
        <p>Select the bookmarks you'd like to import</p>
      </header>

      <div className="importing-bookmarks-list" role="list">
        {records.map((rec, recIndex) => (
          <div key={rec.folder.id} role="listitem">
            <label className="folder-title" title={rec.folder.url}>
              <input
                type="checkbox"
                ref={(el) => (recordsRefs.current[recIndex] = el!)}
                checked={rec.folder.checked}
                onChange={(e) =>
                  handleFolderCheckChange(recIndex, e.target.checked)
                }
              />
              {recordToTitle(rec)}
              <span>
                {rec.folder.title} ({rec.folder.children?.length})
              </span>
            </label>

            <div style={{ marginLeft: "20px" }}>
              {rec.folder.children?.map(
                (item: CustomBookmarkTreeNode, itemIndex) => (
                  <label
                    className="imported-bookmark-child"
                    key={item.id}
                    title={item.url}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) =>
                        handleItemCheckChange(
                          recIndex,
                          itemIndex,
                          e.target.checked,
                        )
                      }
                    />
                    <span className="imported-bookmark-child__text">
                      {item.title}
                    </span>
                    {item.mostVisited ? (
                      <span className="imported-bookmark-fv">
                        Recently visited →
                      </span>
                    ) : null}
                  </label>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="bookmark-import-actions">
        {selectedBookmarksCount > 0 ? (
          <button className="btn__setting primary" onClick={onImport}>
            Import {selectedBookmarksCount} selected bookmarks
          </button>
        ) : (
          <button className="btn__setting primary" disabled={true}>
            Select some bookmarks to import
          </button>
        )}
        <button
          className="btn__setting"
          onClick={onImportAll}
        >
          Import all
        </button>
        <button
          className="btn__setting"
          onClick={onImportRecent}
        >
          Import recent only
        </button>
        <button className="btn__setting" onClick={onSelectAll}>
          Select all bookmarks
        </button>
        {p.onBack && (
          <button className="btn__setting borderless" onClick={p.onBack}>
            Go back
          </button>
        )}
      </div>
    </div>
  );
};

export function BookmarkImporter(p: {
  recentItems: RecentItem[];
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <Modal
      className="modal-app modal-bookmark-import"
      onClose={p.onClose}
    >
      <BookmarkList
        recentItems={p.recentItems}
        onClose={p.onClose}
        onBack={p.onBack}
      />
    </Modal>
  );
}
