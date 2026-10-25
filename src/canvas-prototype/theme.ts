import { combinedDarkCssVariables, combinedLightCssVariables } from "@toeverything/theme";

type ThemePreference = "light" | "dark" | "system";
export type CanvasTheme = "light" | "dark";

const media = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<(theme: CanvasTheme) => void>();
let preference: ThemePreference = "system";
let currentTheme: CanvasTheme = "light";

function isTheme(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function applyTheme() {
  currentTheme = preference === "dark" || (preference === "system" && media.matches) ? "dark" : "light";
  const variables = currentTheme === "dark" ? combinedDarkCssVariables : combinedLightCssVariables;
  for (const [key, value] of Object.entries(variables)) {
    document.documentElement.style.setProperty(key, String(value));
  }
  document.documentElement.dataset.theme = currentTheme;
  document.documentElement.style.colorScheme = currentTheme;
  listeners.forEach((listener) => listener(currentTheme));
}

export function subscribeCanvasTheme(listener: (theme: CanvasTheme) => void) {
  listeners.add(listener);
  listener(currentTheme);
  return () => { listeners.delete(listener); };
}

export function startCanvasThemeSync() {
  const initial = new URLSearchParams(window.location.search).get("theme");
  if (isTheme(initial)) preference = initial;
  applyTheme();

  const onMessage = (event: MessageEvent) => {
    if (
      event.source === window.parent && event.origin === window.location.origin &&
      event.data?.type === "tablo-canvas-theme" && isTheme(event.data.theme)
    ) {
      preference = event.data.theme;
      applyTheme();
    }
  };
  window.addEventListener("message", onMessage);
  media.addEventListener("change", applyTheme);
  if (window.parent !== window) {
    window.parent.postMessage({ type: "tablo-canvas-ready" }, window.location.origin);
  }
  window.addEventListener("pagehide", () => {
    window.removeEventListener("message", onMessage);
    media.removeEventListener("change", applyTheme);
    listeners.clear();
  }, { once: true });
}
