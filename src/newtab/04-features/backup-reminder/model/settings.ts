export const defaultBackupReminderIntervalDays = 30;

export function isValidBackupReminderIntervalDays(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function normalizeBackupReminderIntervalDays(value: unknown): number {
  return isValidBackupReminderIntervalDays(value) ? value : defaultBackupReminderIntervalDays;
}
