// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { DocCollection, Schema } from "@blocksuite/store";
import { AffineSchemas } from "@blocksuite/blocks";
import { initializeCanvas, renameCanvas } from "../canvases";

const state = vi.hoisted(() => ({
  ready: Promise.resolve() as Promise<void>,
  stopToolbar: vi.fn(), stopPreferences: vi.fn(), stopCompatibility: vi.fn(),
}));
vi.mock("@blocksuite/presets", () => {
  class TestEditor extends HTMLElement {
    specs = [];
    doc: unknown;
    updateComplete = Promise.resolve();
    std = { get: () => ({ ready: state.ready }) };
  }
  customElements.define("test-canvas-editor", TestEditor);
  return { EdgelessEditor: TestEditor };
});
vi.mock("../toolbar", () => ({ mountCompactToolbar: () => state.stopToolbar }));
vi.mock("../preferences", async (original) => ({
  ...await original<typeof import("../preferences")>(),
  mountCanvasPreferences: () => state.stopPreferences,
}));
vi.mock("../blocksuite-compat", () => ({ mountTextToolbarAppearance: () => state.stopCompatibility }));

import { createEditorRuntime } from "../editor-runtime";

const collections: DocCollection[] = [];
afterEach(() => {
  for (const collection of collections.splice(0)) {
    collection.forceStop(); collection.dispose(); collection.doc.destroy();
  }
  document.body.replaceChildren();
  state.ready = Promise.resolve();
  vi.clearAllMocks();
});

function fixture() {
  const collection = new DocCollection({ schema: new Schema().register(AffineSchemas) });
  collections.push(collection);
  collection.meta.initialize();
  const first = collection.createDoc(); first.load(); initializeCanvas(first, "Первый");
  const second = collection.createDoc(); second.load(); initializeCanvas(second, "Второй");
  const host = document.createElement("div"); document.body.append(host);
  const onTitle = vi.fn();
  return { first, second, host, onTitle, runtime: createEditorRuntime(host, onTitle, vi.fn()) };
}

it("disposes the previous editor and title observer before mounting another canvas", async () => {
  const { first, second, host, onTitle, runtime } = fixture();
  await runtime.mount(first);
  const previous = runtime.editor;
  await runtime.mount(second);
  expect(previous.isConnected).toBe(false);
  expect(host.children).toHaveLength(1);
  expect(state.stopToolbar).toHaveBeenCalledOnce();
  expect(state.stopPreferences).toHaveBeenCalledOnce();
  expect(state.stopCompatibility).toHaveBeenCalledOnce();
  renameCanvas(first, "Старый документ");
  expect(onTitle).toHaveBeenLastCalledWith("Второй");
  runtime.dispose(); runtime.dispose();
  renameCanvas(second, "Закрытый документ");
  expect(onTitle).toHaveBeenLastCalledWith("Второй");
  expect(host.children).toHaveLength(0);
  expect(state.stopToolbar).toHaveBeenCalledTimes(2);
  expect(() => runtime.editor).toThrow();
});

it("removes a failed editor and permits recovery on the same runtime", async () => {
  const { first, host, runtime } = fixture();
  state.ready = Promise.reject(new Error("Font initialization failed"));
  await expect(runtime.mount(first)).rejects.toThrow("Font initialization failed");
  expect(host.children).toHaveLength(0);
  expect(() => runtime.editor).toThrow();
  state.ready = Promise.resolve();
  await runtime.mount(first);
  expect(runtime.editor.doc).toBe(first);
  runtime.dispose();
});

it("cancels pending initialization on disposal without recreating observers later", async () => {
  const { first, host, onTitle, runtime } = fixture();
  let finish!: () => void;
  state.ready = new Promise<void>(resolve => { finish = resolve; });
  const mounting = runtime.mount(first);
  await Promise.resolve();
  runtime.dispose();
  expect(host.children).toHaveLength(0);
  const aborted = expect(mounting).rejects.toMatchObject({ name: "AbortError" });
  finish();
  await aborted;
  renameCanvas(first, "После закрытия");
  expect(onTitle).not.toHaveBeenCalled();
  expect(state.stopToolbar).not.toHaveBeenCalled();
  expect(() => runtime.editor).toThrow();
});
