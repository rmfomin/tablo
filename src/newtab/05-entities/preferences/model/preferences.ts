export type ColorTheme = "light" | "system" | "dark";

export const defaultBackupReminderIntervalDays = 30;

export function isValidBackupReminderIntervalDays(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function normalizeBackupReminderIntervalDays(value: unknown): number {
  return isValidBackupReminderIntervalDays(value) ? value : defaultBackupReminderIntervalDays;
}

export type UiPreferences = {
  sidebarCollapsed: boolean;
  openBookmarksInNewTab: boolean;
  colorTheme: ColorTheme;
  showRecent: boolean;
  showNotUsed: boolean;
  useSearchResultsPopup?: boolean;
  showGroupBackground?: boolean;
  alignFolderRows?: boolean;
  backupReminderEnabled?: boolean;
  backupReminderIntervalDays?: number;
  lastBackupExportAt?: number;
  backupReminderEnabledAt?: number;
  backupReminderSnoozedUntil?: number;
};

type PreferenceDefinition<T> = {
  isValid(value: unknown): value is T;
} & (
  | { defaultValue: Exclude<T, undefined>; includeInBackup: true }
  | { defaultValue: T; includeInBackup: false }
);

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isColorTheme = (value: unknown): value is ColorTheme =>
  value === "light" || value === "dark" || value === "system";
const isTimestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

// Новое поле UiPreferences требует значения по умолчанию, валидатора и правила экспорта
const preferenceDefinitions = {
  sidebarCollapsed: { defaultValue: false, isValid: isBoolean, includeInBackup: true },
  openBookmarksInNewTab: { defaultValue: false, isValid: isBoolean, includeInBackup: true },
  colorTheme: { defaultValue: "system", isValid: isColorTheme, includeInBackup: true },
  showRecent: { defaultValue: false, isValid: isBoolean, includeInBackup: true },
  showNotUsed: { defaultValue: false, isValid: isBoolean, includeInBackup: true },
  useSearchResultsPopup: { defaultValue: true, isValid: isBoolean, includeInBackup: true },
  showGroupBackground: { defaultValue: true, isValid: isBoolean, includeInBackup: true },
  alignFolderRows: { defaultValue: false, isValid: isBoolean, includeInBackup: true },
  backupReminderEnabled: { defaultValue: false, isValid: isBoolean, includeInBackup: true },
  backupReminderIntervalDays: { defaultValue: defaultBackupReminderIntervalDays, isValid: isValidBackupReminderIntervalDays, includeInBackup: true },
  lastBackupExportAt: { defaultValue: undefined, isValid: isTimestamp, includeInBackup: false },
  backupReminderEnabledAt: { defaultValue: undefined, isValid: isTimestamp, includeInBackup: false },
  backupReminderSnoozedUntil: { defaultValue: undefined, isValid: isTimestamp, includeInBackup: false },
} satisfies { [Key in keyof UiPreferences]-?: PreferenceDefinition<UiPreferences[Key]> };

export const uiPreferenceKeys = Object.keys(preferenceDefinitions) as Array<keyof UiPreferences>;

export const defaultUiPreferences = Object.fromEntries(
  uiPreferenceKeys.map((key) => [key, preferenceDefinitions[key].defaultValue]),
) as UiPreferences;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readUiPreferences(value: unknown, backupOnly = false): Partial<UiPreferences> {
  if (!isRecord(value)) return {};
  const entries = uiPreferenceKeys.flatMap((key) => {
    const definition = preferenceDefinitions[key];
    if (backupOnly && !definition.includeInBackup) return [];
    if (!Object.hasOwn(value, key) || !definition.isValid(value[key])) return [];
    return [[key, value[key]]];
  });
  return Object.fromEntries(entries) as Partial<UiPreferences>;
}

export function normalizeUiPreferences(
  value: unknown,
  defaults: UiPreferences = defaultUiPreferences,
): UiPreferences {
  return { ...defaults, ...readUiPreferences(value) };
}

export type SettingsBackup = {
  version: 1;
  values: Partial<UiPreferences>;
};

export function createSettingsBackup(preferences: UiPreferences): SettingsBackup {
  return { version: 1, values: readUiPreferences(preferences, true) };
}

export function parseSettingsBackup(value: unknown): SettingsBackup | undefined {
  // Незнакомая версия настроек не мешает восстановить закладки
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.values)) return undefined;
  return { version: 1, values: readUiPreferences(value.values, true) };
}
