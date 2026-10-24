import React, { useEffect, useState } from "react";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { saveBackupJson } from "@/newtab/04-features/bookmarks-export/model/dashboardExport";
import { Modal } from "@/newtab/06-shared/ui/Modal/Modal";
import styles from "./BackupReminder.module.scss";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_000_000;

export function BackupReminder() {
  const spaces = useDashboardStore((state) => state.spaces);
  const enabled = useUiStore((state) => state.backupReminderEnabled);
  const intervalDays = useUiStore((state) => state.backupReminderIntervalDays);
  const lastBackupExportAt = useUiStore((state) => state.lastBackupExportAt);
  const enabledAt = useUiStore((state) => state.backupReminderEnabledAt);
  const snoozedUntil = useUiStore((state) => state.backupReminderSnoozedUntil);
  const setLastBackupExportAt = useUiStore((state) => state.setLastBackupExportAt);
  const setSnoozedUntil = useUiStore((state) => state.setBackupReminderSnoozedUntil);
  const isOpen = useUiStore((state) => state.backupReminderVisible);
  const setIsOpen = useUiStore((state) => state.setBackupReminderVisible);
  const showNotification = useUiStore((state) => state.showNotification);
  const [isExporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    let timeoutId: number | undefined;

    function checkReminder() {
      if (!enabled) {
        return;
      }

      const dueAt = (lastBackupExportAt ?? enabledAt ?? 0) + intervalDays * DAY_IN_MS;
      const nextCheckAt = Math.max(dueAt, snoozedUntil ?? 0);
      const delay = nextCheckAt - Date.now();
      if (delay <= 0) {
        setIsOpen(true);
        return;
      }

      timeoutId = window.setTimeout(checkReminder, Math.min(delay, MAX_TIMEOUT_MS));
    }

    checkReminder();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [enabled, intervalDays, lastBackupExportAt, enabledAt, snoozedUntil, setIsOpen]);

  useEffect(() => {
    if (isOpen) setExportError("");
  }, [isOpen]);

  async function exportBackup() {
    if (isExporting) return;
    setExporting(true);
    setExportError("");
    try {
      const saved = await saveBackupJson(spaces);
      if (!saved) {
        setExportError("Backup was not saved. You can try again.");
        return;
      }
      setLastBackupExportAt(Date.now());
      setSnoozedUntil(undefined);
      setIsOpen(false);
      showNotification({ message: "Backup saved" });
    } catch {
      setExportError("Unable to save the backup. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function remindTomorrow() {
    setSnoozedUntil(Date.now() + DAY_IN_MS);
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <Modal className="modal-app modal-shortcuts" onClose={() => {
      if (!isExporting) setIsOpen(false);
    }}>
      <div className="modal-no-override">
        <h2>Time to back up Tablo</h2>
        <p>Save a backup of your spaces, bookmarks and settings? You can choose a folder on your computer.</p>
        {exportError ? <p className={styles.error} role="alert">{exportError}</p> : null}
        <div className={styles.actions}>
          <button type="button" className="btn__setting primary" disabled={isExporting} onClick={exportBackup}>
            {isExporting ? "Saving…" : "Save backup"}
          </button>
          <button type="button" className="btn__setting" disabled={isExporting} onClick={remindTomorrow}>
            Remind me tomorrow
          </button>
        </div>
      </div>
    </Modal>
  );
}
