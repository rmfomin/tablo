// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SidebarRecent } from "@/newtab/03-widgets/sidebar/SidebarRecent/SidebarRecent";
import type { RecentItem } from "@/newtab/06-shared/api/chrome/history";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";

vi.mock("@/newtab/03-widgets/sidebar/SidebarItem/SidebarItem", () => ({
  TabOrRecentItem: ({ data }: { data: RecentItem }) =>
    React.createElement("div", { "data-recent-title": data.title }, data.title),
}));

const items: RecentItem[] = [
  { id: 1, isRecent: true, favIconUrl: "", title: "Привет", url: "https://hello.example" },
  { id: 2, isRecent: true, favIconUrl: "", title: "ghbdtn", url: "https://keyboard.example" },
  { id: 3, isRecent: true, favIconUrl: "", title: "Other page", url: "https://other.example" },
];

function renderRecent() {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      React.createElement(SidebarRecent, {
        recentItems: items,
        search: "",
        searchFilters: [],
        searchFilterMode: "or",
        spaces: [],
        sidebarCollapsed: false,
      }),
    );
  });
  return { host, root };
}

function clickSearch(host: HTMLElement) {
  const button = host.querySelector<HTMLButtonElement>(
    '[aria-label="Search recent items"]',
  );
  expect(button).not.toBeNull();
  flushSync(() => button!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  return host.querySelector<HTMLInputElement>("input[aria-label='Search recent items']");
}

function enterSearch(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  flushSync(() => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

test("recent search opens in the header and immediately receives focus", async () => {
  uiStore.getState().setShowRecent(false);
  const { host, root } = renderRecent();

  const input = clickSearch(host);
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(input).not.toBeNull();
  expect(document.activeElement).toBe(input);
  expect(host.querySelector('button[aria-label="Close recent search"]')).not.toBeNull();
  expect(host.querySelector('button[aria-label="Hide recent items"]')).toBeNull();
  expect(host.querySelectorAll("[data-recent-title]")).toHaveLength(3);

  flushSync(() => root.unmount());
  host.remove();
});

test("search button toggles the header input closed and restores Recent controls", async () => {
  uiStore.getState().setShowRecent(true);
  const { host, root } = renderRecent();
  const input = clickSearch(host)!;
  await new Promise((resolve) => setTimeout(resolve, 0));
  enterSearch(input, "other");
  await new Promise((resolve) => setTimeout(resolve, 0));

  const closeSearch = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Close recent search"]',
  );
  expect(closeSearch).not.toBeNull();
  flushSync(() => closeSearch!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(host.querySelector("input[aria-label='Search recent items']")).toBeNull();
  expect(host.textContent).toContain("Recent");
  expect(host.querySelector('button[aria-label="Hide recent items"]')).not.toBeNull();
  expect(host.querySelectorAll("[data-recent-title]")).toHaveLength(3);

  flushSync(() => root.unmount());
  host.remove();
});

test("recent search matches both Cyrillic and Latin keyboard layouts", async () => {
  uiStore.getState().setShowRecent(true);
  const { host, root } = renderRecent();
  const input = clickSearch(host)!;
  await new Promise((resolve) => setTimeout(resolve, 0));

  enterSearch(input, "ghbdtn");
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(Array.from(host.querySelectorAll("[data-recent-title]"), (item) => item.textContent)).toEqual([
    "Привет",
    "ghbdtn",
  ]);

  enterSearch(input, "привет");
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(Array.from(host.querySelectorAll("[data-recent-title]"), (item) => item.textContent)).toEqual([
    "Привет",
    "ghbdtn",
  ]);

  flushSync(() => root.unmount());
  host.remove();
});

test("Escape and outside click close recent search and restore all items", async () => {
  uiStore.getState().setShowRecent(true);
  const { host, root } = renderRecent();
  let input = clickSearch(host)!;
  await new Promise((resolve) => setTimeout(resolve, 0));

  enterSearch(input, "other");
  await new Promise((resolve) => setTimeout(resolve, 0));
  flushSync(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(host.querySelector("input[aria-label='Search recent items']")).toBeNull();
  expect(host.querySelectorAll("[data-recent-title]")).toHaveLength(3);

  input = clickSearch(host)!;
  await new Promise((resolve) => setTimeout(resolve, 0));
  const outside = document.createElement("button");
  document.body.append(outside);
  flushSync(() => outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(host.querySelector("input[aria-label='Search recent items']")).toBeNull();
  outside.remove();

  flushSync(() => root.unmount());
  host.remove();
});
