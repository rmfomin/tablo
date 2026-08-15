type LocalStorageRecord = Record<string, unknown>;

export function readLocalStorage(
  keys: string[],
  callback: (items: LocalStorageRecord) => void,
): void {
  chrome.storage.local.get(keys, callback);
}

export function writeLocalStorage(items: LocalStorageRecord): void {
  chrome.storage.local.set(items);
}
