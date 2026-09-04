import React from "react";
import cn from "clsx";
import { Bookmarks } from "@/newtab/03-widgets/dashboard/Bookmarks/Bookmarks";
import { Sidebar } from "@/newtab/03-widgets/sidebar/Sidebar/Sidebar";
import { Notification } from "@/newtab/03-widgets/ui/Notification/Notification";
import { ImportBookmarksFromSettings } from "@/newtab/04-features/bookmarks-import/ui/ImportBookmarksFromSettings";
import { KeyboardAndMouseManager } from "@/newtab/01-app/ui/KeyboardAndMouseManager";
import { TopBar } from "@/newtab/03-widgets/top-bar/TopBar/TopBar";
import styles from "./NewtabPage.module.scss";

type NewtabPageProps = {
  page: "default" | "import";
  search: string;
  sidebarCollapsed: boolean;
};

/** Композиция newtab-страницы; lifecycle и инициализация остаются в app. */
export function NewtabPage({
  page,
  search,
  sidebarCollapsed,
}: NewtabPageProps) {
  return (
    <div className={cn("app", { "collapsible-sidebar": sidebarCollapsed })}>
      <Notification />
      {page === "import" ? <ImportBookmarksFromSettings /> : null}
      {page === "default" ? (
        <>
          <div className={styles.workspace}>
            <Sidebar />
            <div className={styles.mainColumn}>
              <TopBar />
              <Bookmarks />
            </div>
          </div>
          <KeyboardAndMouseManager search={search} />
        </>
      ) : null}
    </div>
  );
}
