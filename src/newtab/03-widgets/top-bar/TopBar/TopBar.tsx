import React, { useState } from "react";
import { DropdownMenu, getPointerPosition } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import type { Point } from "@/newtab/06-shared/lib/math";
import { SettingsOptions } from "./settingsOptions";
import cn from "clsx";
import IconSettings from "./icons/settings.svg";
import styles from "./TopBar.module.scss";
import { PopularPagesModal } from "@/newtab/03-widgets/ui/PopularPagesModal/PopularPagesModal";
import { BackupReminderSettingsModal } from "@/newtab/03-widgets/ui/BackupReminder/BackupReminderSettingsModal";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";

export function TopBar({ spreadActions = false, centerActions = false }: { spreadActions?: boolean; centerActions?: boolean }) {
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState(false);
  const [settingsMenuPosition, setSettingsMenuPosition] = useState<Point>();
  const [isPopularPagesModalOpen, setPopularPagesModalOpen] = useState(false);
  const [isBackupReminderSettingsOpen, setBackupReminderSettingsOpen] = useState(false);
  const setBackupReminderVisible = useUiStore((state) => state.setBackupReminderVisible);
  const setPage = useUiStore((state) => state.setPage);

  function onToggleSettings(event: React.MouseEvent) {
    setSettingsMenuPosition(getPointerPosition(event));
    setSettingsMenuVisibility(!settingsMenuVisibility);
  }

  return (
    <header
      className={cn(styles.root, {
        [styles.spread]: spreadActions,
        [styles.centered]: centerActions,
      })}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className={cn(styles.menuButtons, {
        [styles.spread]: spreadActions,
        [styles.centered]: centerActions,
      })}>
        <button
          type="button"
          className={styles.controlButton}
          title="Холст · прототип"
          aria-label="Открыть холст"
          onClick={() => setPage("canvas")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <rect x="7" y="7" width="4" height="4" rx="1" />
            <path d="M9 11v5h4m0 0-2-2m2 2-2 2M14 7h3m-3 3h3" />
          </svg>
        </button>
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
              <SettingsOptions
                onClose={() => setSettingsMenuVisibility(false)}
                onOpenPopularPages={() => {
                  setSettingsMenuVisibility(false);
                  setPopularPagesModalOpen(true);
                }}
                onOpenBackupReminders={() => {
                  setSettingsMenuVisibility(false);
                  setBackupReminderSettingsOpen(true);
                }}
              />
            </DropdownMenu>
          )}
        </div>
      </div>
      {isPopularPagesModalOpen && (
        <PopularPagesModal onClose={() => setPopularPagesModalOpen(false)} />
      )}
      {isBackupReminderSettingsOpen && (
        <BackupReminderSettingsModal
          onClose={() => setBackupReminderSettingsOpen(false)}
          onCheckNow={() => {
            setBackupReminderSettingsOpen(false);
            setBackupReminderVisible(true);
          }}
        />
      )}
    </header>
  );
}
