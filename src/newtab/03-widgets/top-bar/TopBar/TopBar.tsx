import React, { useState } from "react";
import { DropdownMenu } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { HelpOptions, SettingsOptions } from "./settingsOptions";
import cn from "clsx";
import { hasSearch } from "@/newtab/04-features/bookmark-search/model/filters";
import IconHelp from "./icons/help.svg";
import IconSettings from "./icons/settings.svg";
import { SpacesList } from "@/newtab/03-widgets/spaces-list/SpacesList/SpacesList";
import styles from "./TopBar.module.scss";

export function TopBar(p: { isScrolled: boolean }) {
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState(false);
  const [helpMenuVisibility, setHelpMenuVisibility] = useState(false);
  const search = useUiStore((state) => state.search);
  const searchFilters = useUiStore((state) => state.searchFilters);
  const searchActive = hasSearch(
    search,
    searchFilters,
  );

  function onToggleHelpSettings() {
    setHelpMenuVisibility(!helpMenuVisibility);
  }

  function onToggleSettings() {
    setSettingsMenuVisibility(!settingsMenuVisibility);
  }

  return (
    <div
      className={cn(styles.root, {
        [styles.scrolled]: p.isScrolled,
      })}
    >
      {searchActive && (
        <div className={styles.searchResultsHeader}>Search results:</div>
      )}

      {!searchActive && (
        <SpacesList />
      )}

      <div className={styles.stretchingSpace}></div>

      <div className={styles.menuButtons}>
        <button
          className={`btn__icon ${helpMenuVisibility ? "active" : ""}`}
          onClick={onToggleHelpSettings}
        >
          <IconHelp />
        </button>

        <button
          className={`btn__icon ${settingsMenuVisibility ? "active" : ""}`}
          onClick={onToggleSettings}
        >
          <IconSettings />
        </button>

        {helpMenuVisibility && (
          <DropdownMenu
            onClose={() => {
              setHelpMenuVisibility(false);
            }}
            noSmartPositioning={true}
            alignRight={true}
            offset={{ top: 38, right: 48 }}
          >
            <HelpOptions />
          </DropdownMenu>
        )}

        {settingsMenuVisibility && (
          <DropdownMenu
            onClose={() => {
              setSettingsMenuVisibility(false);
            }}
            noSmartPositioning={true}
            alignRight={true}
            offset={{ top: 38 }}
          >
            <SettingsOptions />
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
