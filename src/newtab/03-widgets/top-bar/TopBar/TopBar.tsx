import React, { useState } from "react";
import { DropdownMenu, getPointerPosition } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import type { Point } from "@/newtab/06-shared/lib/math";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { HelpOptions, SettingsOptions } from "./settingsOptions";
import cn from "clsx";
import type { ColorTheme } from "@/newtab/05-entities/dashboard/model/types";
import { SearchInput } from "@/newtab/04-features/bookmark-search/ui/SearchInput";
import { ThemeOptionIcon } from "@/newtab/03-widgets/ui/ThemeOptionIcon/ThemeOptionIcon";
import IconHelp from "./icons/help.svg";
import IconSettings from "./icons/settings.svg";
import styles from "./TopBar.module.scss";

const themes: Array<{ value: ColorTheme; title: string }> = [
  { value: "light", title: "Light theme" },
  { value: "system", title: "System theme" },
  { value: "dark", title: "Dark theme" },
];

export function TopBar() {
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState(false);
  const [helpMenuVisibility, setHelpMenuVisibility] = useState(false);
  const [settingsMenuPosition, setSettingsMenuPosition] = useState<Point>();
  const [helpMenuPosition, setHelpMenuPosition] = useState<Point>();
  const colorTheme = useUiStore((state) => state.colorTheme);
  const setColorTheme = useUiStore((state) => state.setColorTheme);

  function onToggleHelpSettings(event: React.MouseEvent) {
    setHelpMenuPosition(getPointerPosition(event));
    setHelpMenuVisibility(!helpMenuVisibility);
  }

  function onToggleSettings(event: React.MouseEvent) {
    setSettingsMenuPosition(getPointerPosition(event));
    setSettingsMenuVisibility(!settingsMenuVisibility);
  }

  return (
    <header
      className={styles.root}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className={styles.searchSlot}>
        <SearchInput />
      </div>

      <div className={styles.menuButtons}>
        <div className={styles.themeSwitcher} aria-label="Theme">
          {themes.map((theme) => (
            <button
              key={theme.value}
              type="button"
              className={cn(styles.themeButton, {
                [styles.activeTheme]: colorTheme === theme.value,
              })}
              title={theme.title}
              aria-label={theme.title}
              aria-pressed={colorTheme === theme.value}
              onClick={() => setColorTheme(theme.value)}
            >
              <ThemeOptionIcon theme={theme.value} />
            </button>
          ))}
        </div>

        <div className={styles.menuButtonWrap}>
          <button
            type="button"
            className={cn(styles.controlButton, {
              [styles.activeControl]: helpMenuVisibility,
            })}
            title="Information"
            aria-label="Information"
            aria-expanded={helpMenuVisibility}
            onClick={onToggleHelpSettings}
          >
            <IconHelp />
          </button>

          {helpMenuVisibility && (
            <DropdownMenu
              onClose={() => {
                setHelpMenuVisibility(false);
              }}
              absPosition={helpMenuPosition}
            >
              <HelpOptions />
            </DropdownMenu>
          )}
        </div>

        <div className={styles.menuButtonWrap}>
          <button
            type="button"
            className={cn(styles.controlButton, {
              [styles.activeControl]: settingsMenuVisibility,
            })}
            title="Settings"
            aria-label="Settings"
            aria-expanded={settingsMenuVisibility}
            onClick={onToggleSettings}
          >
            <IconSettings />
          </button>

          {settingsMenuVisibility && (
            <DropdownMenu
              onClose={() => {
                setSettingsMenuVisibility(false);
              }}
              absPosition={settingsMenuPosition}
            >
              <SettingsOptions />
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
