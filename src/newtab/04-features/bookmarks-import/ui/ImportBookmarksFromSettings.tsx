import React from "react";
import { BookmarkImporter } from "@/newtab/04-features/bookmarks-import/ui/BookmarksImporter";
import { useChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";

export function ImportBookmarksFromSettings() {
  const recentItems = useChromeRuntimeStore((state) => state.recentItems);
  const setPage = useUiStore((state) => state.setPage);

  const onClose = () => {
    setPage("default");
  };

  return (
    <div className="welcome welcome__align-top">
      <div className="welcome-scrollable">
        <BookmarkImporter recentItems={recentItems} onClose={onClose} />
      </div>
    </div>
  );
}
