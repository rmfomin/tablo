import React, { useState } from "react";
import { DropdownMenu } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
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

function TabloLogo() {
  return (
    <div className={styles.logo} aria-label="Tablo">
      <svg
        className={styles.logoMark}
        width="22"
        height="22"
        viewBox="0 0 22 22"
        aria-hidden="true"
      >
        <rect x="0" y="0" width="12" height="10" rx="2.5" />
        <rect
          className={styles.logoMarkMuted}
          x="14"
          y="0"
          width="8"
          height="10"
          rx="2.5"
        />
        <rect
          className={styles.logoMarkMuted}
          x="0"
          y="12"
          width="8"
          height="10"
          rx="2.5"
        />
        <rect x="10" y="12" width="12" height="10" rx="2.5" />
      </svg>
      <span className={styles.logoText}>tablo</span>
    </div>
  );
}

export function TopBar() {
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState(false);
  const [helpMenuVisibility, setHelpMenuVisibility] = useState(false);
  const colorTheme = useUiStore((state) => state.colorTheme);
  const setColorTheme = useUiStore((state) => state.setColorTheme);

  function onToggleHelpSettings() {
    setHelpMenuVisibility(!helpMenuVisibility);
  }

  function onToggleSettings() {
    setSettingsMenuVisibility(!settingsMenuVisibility);
  }

  return (
    <header className={styles.root}>
      <div className={styles.logoSlot}>
        <TabloLogo />
      </div>

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
              alignRight={true}
              offset={{ top: 56 }}
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
              alignRight={true}
              offset={{ top: 56 }}
            >
              <SettingsOptions />
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
