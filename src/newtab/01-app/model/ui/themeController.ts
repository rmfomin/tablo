import type { ColorTheme } from "@/newtab/05-entities/dashboard/model/types";

type ThemeRoot = {
  classList: {
    add(className: string): void;
    remove(className: string): void;
  };
};

type ThemeMediaQuery = {
  readonly matches: boolean;
  addEventListener(eventName: "change", listener: ThemeMediaListener): void;
  removeEventListener(eventName: "change", listener: ThemeMediaListener): void;
};

type ThemeMediaListener = (event: { matches: boolean }) => void;

export type ThemeController = {
  applyTheme(theme: ColorTheme): void;
  dispose(): void;
};

/**
 * DOM boundary для темы. UI store хранит только выбранный режим, а этот
 * controller применяет class и подписывается на системную цветовую схему.
 */
export function createThemeController(
  root: ThemeRoot,
  mediaQuery: ThemeMediaQuery,
): ThemeController {
  let useSystemTheme = false;

  function setDarkTheme(useDarkTheme: boolean): void {
    if (useDarkTheme) {
      root.classList.add("dark-theme");
    } else {
      root.classList.remove("dark-theme");
    }
  }

  const onSystemThemeChanged: ThemeMediaListener = (event) => {
    if (useSystemTheme) {
      setDarkTheme(event.matches);
    }
  };
  mediaQuery.addEventListener("change", onSystemThemeChanged);

  return {
    applyTheme(theme): void {
      useSystemTheme = theme === "system";
      setDarkTheme(theme === "dark" || (useSystemTheme && mediaQuery.matches));
    },
    dispose(): void {
      mediaQuery.removeEventListener("change", onSystemThemeChanged);
    },
  };
}

export function createBrowserThemeController(): ThemeController {
  return createThemeController(
    document.documentElement,
    window.matchMedia("(prefers-color-scheme: dark)"),
  );
}
