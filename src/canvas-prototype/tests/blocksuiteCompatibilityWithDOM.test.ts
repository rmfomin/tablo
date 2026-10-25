// @vitest-environment happy-dom
import { expect, it } from "vitest";
import type { EdgelessEditor } from "@blocksuite/presets";
import { mountTextToolbarAppearance } from "../blocksuite-compat";

it("adapts a toolbar created later and disconnects the observer on disposal", async () => {
  const editor = document.createElement("div");
  const dispose = mountTextToolbarAppearance(editor as unknown as EdgelessEditor);
  const toolbar = document.createElement("edgeless-element-toolbar-widget");
  const toolbarRoot = toolbar.attachShadow({ mode: "open" });
  editor.append(toolbar);
  const menu = document.createElement("edgeless-change-text-menu");
  const menuRoot = menu.attachShadow({ mode: "open" });
  toolbarRoot.append(menu);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(menuRoot.querySelectorAll("style")).toHaveLength(1);
  menuRoot.append(document.createElement("span"));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(menuRoot.querySelectorAll("style")).toHaveLength(1);
  dispose();
  const nextMenu = document.createElement("edgeless-change-text-menu");
  const nextRoot = nextMenu.attachShadow({ mode: "open" });
  toolbarRoot.append(nextMenu);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(nextRoot.querySelector("style")).toBeNull();
});
