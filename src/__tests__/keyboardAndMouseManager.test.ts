// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { KeyboardAndMouseManager } from "@/newtab/01-app/ui/KeyboardAndMouseManager";
import { dashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";

test("Ctrl or Alt plus a number does not switch spaces", async () => {
  dashboardStore.setState({ spaces: [], currentSpaceId: 42 });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  flushSync(() => {
    root.render(
      React.createElement(KeyboardAndMouseManager, {
        searchOpen: false,
        onOpenSearch: vi.fn(),
        onCloseSearch: vi.fn(),
      }),
    );
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  (document.activeElement as HTMLElement | null)?.blur();
  document.body.focus();
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      code: "Digit1",
      key: "1",
      ctrlKey: true,
    }),
  );

  expect(dashboardStore.getState().currentSpaceId).toBe(42);

  flushSync(() => root.unmount());
  host.remove();
  dashboardStore.setState({ spaces: [], currentSpaceId: -1 });
});
