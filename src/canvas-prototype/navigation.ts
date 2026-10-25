export function returnToBookmarks() {
  if (window.parent !== window) {
    window.parent.postMessage({ type: "tablo-canvas-close" }, window.location.origin);
    return;
  }
  const page = window.location.protocol === "chrome-extension:" ? "./newtab.html" : "./demo.html";
  window.location.href = new URL(page, window.location.href).href;
}
