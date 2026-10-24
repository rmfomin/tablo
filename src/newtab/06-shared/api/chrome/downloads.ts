export function downloadWithSaveDialog(url: string, filename: string): Promise<boolean> {
  if (!chrome.downloads) return Promise.resolve(false);

  return new Promise((resolve) => {
    let downloadId: number | undefined;
    let settled = false;
    let listenerAdded = false;

    function finish(saved: boolean) {
      if (settled) return;
      settled = true;
      if (listenerAdded) chrome.downloads.onChanged.removeListener(onChanged);
      resolve(saved);
    }

    function checkState(state: string | undefined) {
      if (state === "complete") finish(true);
      if (state === "interrupted") finish(false);
    }

    function onChanged(change: chrome.downloads.DownloadDelta) {
      if (change.id === downloadId) checkState(change.state?.current);
    }

    try {
      chrome.downloads.onChanged.addListener(onChanged);
      listenerAdded = true;
      chrome.downloads.download({ url, filename, saveAs: true }, (id) => {
        const error = chrome.runtime.lastError;
        if (error || id === undefined) {
          finish(false);
          return;
        }
        downloadId = id;
        chrome.downloads.search({ id }, (items) => {
          const searchError = chrome.runtime.lastError;
          if (searchError || !items[0]) {
            finish(false);
            return;
          }
          checkState(items[0].state);
        });
      });
    } catch {
      finish(false);
    }
  });
}
