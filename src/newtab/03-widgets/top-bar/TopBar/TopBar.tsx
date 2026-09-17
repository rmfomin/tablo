import React, { useState } from "react";
import { DropdownMenu, getPointerPosition } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import type { Point } from "@/newtab/06-shared/lib/math";
import { SettingsOptions } from "./settingsOptions";
import cn from "clsx";
import IconSettings from "./icons/settings.svg";
import styles from "./TopBar.module.scss";

export function TopBar() {
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState(false);
  const [settingsMenuPosition, setSettingsMenuPosition] = useState<Point>();

  function onToggleSettings(event: React.MouseEvent) {
    setSettingsMenuPosition(getPointerPosition(event));
    setSettingsMenuVisibility(!settingsMenuVisibility);
  }

  return (
    <header
      className={styles.root}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className={styles.menuButtons}>
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
              className="dropdown-menu--context"
              onClose={() => {
                setSettingsMenuVisibility(false);
              }}
              absPosition={settingsMenuPosition}
            >
              <SettingsOptions onClose={() => setSettingsMenuVisibility(false)} />
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
