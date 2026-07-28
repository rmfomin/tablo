import { createThemeController } from "@/newtab/state/ui/themeController";

type MediaListener = (event: { matches: boolean }) => void;

function createRoot() {
  const classNames = new Set<string>();

  return {
    classList: {
      add: (className: string) => classNames.add(className),
      remove: (className: string) => classNames.delete(className),
      contains: (className: string) => classNames.has(className),
    },
  };
}

function createMediaQuery(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners: MediaListener[] = [];

  return {
    get matches() {
      return matches;
    },
    addEventListener: (_eventName: "change", listener: MediaListener) => {
      listeners.push(listener);
    },
    removeEventListener: (_eventName: "change", listener: MediaListener) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    },
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}

test("theme controller применяет system theme и реагирует на изменение системы", () => {
  const root = createRoot();
  const mediaQuery = createMediaQuery(false);
  const controller = createThemeController(root, mediaQuery);

  controller.applyTheme("system");
  expect(root.classList.contains("dark-theme")).toBe(false);

  mediaQuery.setMatches(true);
  expect(root.classList.contains("dark-theme")).toBe(true);

  controller.dispose();
});

test("theme controller перестаёт слушать system theme после fixed theme", () => {
  const root = createRoot();
  const mediaQuery = createMediaQuery(false);
  const controller = createThemeController(root, mediaQuery);

  controller.applyTheme("dark");
  mediaQuery.setMatches(false);

  expect(root.classList.contains("dark-theme")).toBe(true);
  controller.dispose();
});
