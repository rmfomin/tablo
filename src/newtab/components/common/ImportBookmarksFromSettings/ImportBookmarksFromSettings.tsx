import React from "react";
import { BookmarkImporter } from "@/newtab/components/common/BookmarksImporter/BookmarksImporter";
import { useChromeRuntimeStore } from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import { useUiStore } from "@/newtab/state/ui/uiStore";

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
