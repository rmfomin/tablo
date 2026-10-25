import { EdgelessEditor } from "@blocksuite/presets";
import { FontLoaderService, type RootBlockModel } from "@blocksuite/blocks";
import type { Doc } from "@blocksuite/store";
import { mountCompactToolbar } from "./toolbar";
import { mountCanvasPreferences, readCanvasPreferences, canvasPreferencesExtension } from "./preferences";
import { createCanvasModeExtension } from "./mode";
import { canvasFontsExtension } from "./fonts";
import { mountTextToolbarAppearance } from "./blocksuite-compat";

export function createEditorRuntime(host: HTMLElement, onTitle: (name: string) => void, addImage: () => void) {
  let current: EdgelessEditor | undefined;
  let disposeCurrent = () => {};
  let generation = 0;
  let closed = false;
  return {
    get editor() {
      if (!current) throw new Error("Редактор холста ещё не готов");
      return current;
    },
    async mount(doc: Doc) {
      if (closed) throw new DOMException("Редактор закрыт", "AbortError");
      const mountedGeneration = ++generation;
      const assertActive = () => {
        if (closed || generation !== mountedGeneration) throw new DOMException("Открытие холста отменено", "AbortError");
      };
      disposeCurrent();
      current = undefined;
      const editor = new EdgelessEditor();
      const cleanups: (() => void)[] = [];
      const dispose = () => {
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
        editor.remove();
      };
      disposeCurrent = dispose;
      editor.dataset.toolbarMode = readCanvasPreferences(doc).toolbarMode;
      editor.specs = [...editor.specs, createCanvasModeExtension(doc.id), canvasFontsExtension, canvasPreferencesExtension];
      editor.doc = doc;
      host.replaceChildren(editor);
      try {
        await editor.updateComplete;
        assertActive();
        await editor.std.get(FontLoaderService).ready;
        assertActive();
        cleanups.push(mountCanvasPreferences(editor));
        cleanups.push(mountCompactToolbar(editor, addImage));
        cleanups.push(mountTextToolbarAppearance(editor));
        const title = (doc.root as RootBlockModel).title;
        const updateTitle = () => {
          const name = title.toString().trim() || "Мой холст";
          if (doc.collection.meta.getDocMeta(doc.id)?.title !== name) doc.collection.setDocMeta(doc.id, { title: name });
          onTitle(name);
        };
        title.yText.observe(updateTitle);
        cleanups.push(() => title.yText.unobserve(updateTitle));
        updateTitle();
        current = editor;
        disposeCurrent = dispose;
      } catch (error) {
        dispose();
        throw error;
      }
    },
    dispose() {
      closed = true;
      generation++;
      disposeCurrent();
      current = undefined;
    },
  };
}
