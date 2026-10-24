import React, { useState } from "react";
import cn from "clsx";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { isValidBackupReminderIntervalDays } from "@/newtab/04-features/backup-reminder/model/settings";
import { Modal } from "@/newtab/06-shared/ui/Modal/Modal";
import ToggleLeftIcon from "@/newtab/06-shared/ui/DropdownMenu/img/toggle-left.svg";
import ToggleRightIcon from "@/newtab/06-shared/ui/DropdownMenu/img/toggle-right.svg";
import styles from "./BackupReminder.module.scss";

export function BackupReminderSettingsModal({
  onClose,
  onCheckNow,
}: {
  onClose: () => void;
  onCheckNow: () => void;
}) {
  const reminderEnabled = useUiStore((state) => state.backupReminderEnabled);
  const intervalDays = useUiStore((state) => state.backupReminderIntervalDays);
  const setEnabled = useUiStore((state) => state.setBackupReminderEnabled);
  const setIntervalDays = useUiStore((state) => state.setBackupReminderIntervalDays);
  const [enabled, setEnabledDraft] = useState(reminderEnabled);
  const [days, setDays] = useState(String(intervalDays));
  const [error, setError] = useState("");

  function saveSettings(): boolean {
    const value = Number(days);
    if (!isValidBackupReminderIntervalDays(value)) {
      setError("Enter a positive whole number of days.");
      return false;
    }
    setIntervalDays(value);
    setEnabled(enabled);
    return true;
  }

  return (
    <Modal className="modal-app modal-shortcuts" onClose={onClose}>
      <form className="modal-no-override" onSubmit={(event) => {
        event.preventDefault();
        if (saveSettings()) onClose();
      }}>
        <h2>Backup reminders</h2>
        <button
          type="button"
          className={cn(
            "dropdown-menu__button dropdown-menu__button--with-icon focusable",
            styles.enabledOption,
            { "dropdown-menu__toggle-button--active": enabled },
          )}
          aria-pressed={enabled}
          onClick={() => setEnabledDraft((value) => !value)}
        >
          <span className="dropdown-menu__toggle-icon" aria-hidden="true">
            <ToggleLeftIcon focusable="false" />
            <ToggleRightIcon focusable="false" />
          </span>
          <span>Enable backup reminders</span>
        </button>
        <label className={styles.intervalOption} htmlFor="backup-reminder-days">
          Remind every
          <input
            id="backup-reminder-days"
            className={styles.daysInput}
            type="number"
            min="1"
            step="1"
            required
            value={days}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "backup-reminder-error" : undefined}
            onChange={(event) => {
              setDays(event.target.value);
              setError("");
            }}
          />
          days
        </label>
        {error ? <p id="backup-reminder-error" className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          <button type="submit" className="btn__setting primary">Save</button>
          <button type="button" className="btn__setting" onClick={() => {
            if (saveSettings()) onCheckNow();
          }}>Check now</button>
        </div>
      </form>
    </Modal>
  );
}
