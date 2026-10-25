import { effects as registerBlocks } from "@blocksuite/blocks/effects";
import { effects as registerPresets } from "@blocksuite/presets/effects";
import { addImages, ColorScheme, getThemeObserver } from "@blocksuite/blocks";
import { openSession, exportBackup, waitForSave } from "./storage";
import { showError } from "./errors";
import { returnToBookmarks } from "./navigation";
import { subscribeCanvasTheme } from "./theme";
import { readCanvasPreferences, saveCanvasPreferences, type CanvasPreferences } from "./preferences";
import { canvasName, initializeCanvas, renameCanvas } from "./canvases";

import { createEditorRuntime } from "./editor-runtime";
import { createCanvasController } from "./canvas-controller";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function startEditor() {
  registerBlocks();
  registerPresets();
  const themeObserver = getThemeObserver();
  const stopTheme = subscribeCanvasTheme((theme) => {
    themeObserver.theme$.value = theme === "dark" ? ColorScheme.Dark : ColorScheme.Light;
  });
  const host = document.querySelector<HTMLElement>("#editor")!;
  const status = document.querySelector<HTMLElement>("#status")!;
  const errorMessage = document.querySelector<HTMLElement>("#error")!;
  const fileInput = document.querySelector<HTMLInputElement>("#file")!;
  const imageInput = document.querySelector<HTMLInputElement>("#image-file")!;
  const menu = document.querySelector<HTMLElement>("#canvas-menu")!;
  const title = document.querySelector<HTMLElement>("#canvas-title")!;
  const settings = document.querySelector<HTMLDialogElement>("#canvas-settings")!;
  const nameInput = document.querySelector<HTMLInputElement>("#canvas-name")!;
  const renameDialog = document.querySelector<HTMLDialogElement>("#canvas-rename")!;
  const canvasList = document.querySelector<HTMLElement>("#canvas-list")!;
  const backgroundInput = document.querySelector<HTMLSelectElement>("#canvas-background")!;
  const snapInput = document.querySelector<HTMLInputElement>("#canvas-snap")!;
  const guidesInput = document.querySelector<HTMLInputElement>("#canvas-guides")!;
  const openingInput = document.querySelector<HTMLSelectElement>("#canvas-opening")!;
  const optimizeImagesInput = document.querySelector<HTMLInputElement>("#canvas-optimize-images")!;
  const toolbarModeInput = document.querySelector<HTMLSelectElement>("#canvas-toolbar-mode")!;
  const exportDialog = document.querySelector<HTMLDialogElement>("#canvas-export")!;
  const exportImagesInput = document.querySelector<HTMLSelectElement>("#export-images")!;
  const exportScopeInput = document.querySelector<HTMLSelectElement>("#export-scope")!;
  const buttons = ["import", "export", "settings", "settings-save", "export-save", "rename-save", "canvas-add"].map((id) => document.getElementById(id) as HTMLButtonElement);
  let busy = false;

  const onStatus = (saving: boolean, error?: unknown) => {
    status.dataset.error = String(Boolean(error));
    status.textContent = saving ? "Сохраняется…" : "Сохранено в браузере";
    if (error) showError(new Error("Не удалось сохранить холст. Скачайте JSON перед закрытием"));
  };

  const session = await openSession(onStatus);
  if (!session.doc.root) initializeCanvas(session.doc, "Холст 1");
  const runtime = createEditorRuntime(host, (name) => {
    title.textContent = name;
    title.title = `${name} · двойной щелчок — переименовать`;
    document.title = `${name} — Tablo`;
    renderCanvasList();
  }, () => imageInput.click());
  const controller = createCanvasController(session, () => runtime.mount(session.doc));
  try {
    await runtime.mount(session.doc);
    await waitForSave(session);
    session.activate();
  } catch (error) {
    runtime.dispose();
    stopTheme();
    session.close();
    throw error;
  }
  buttons.forEach((button) => { button.disabled = false; });
  const catalogChanged = session.collection.meta.docMetaUpdated.on(renderCanvasList);

  function renderCanvasList() {
    canvasList.replaceChildren(...session.collection.meta.docMetas.map(meta => {
      const button = document.createElement("button");
      button.type = "button";
      button.role = "radio";
      button.setAttribute("aria-checked", String(meta.id === session.doc.id));
      button.textContent = canvasName(session.collection.getDoc(meta.id)!);
      button.title = button.textContent;
      button.disabled = busy;
      button.addEventListener("click", () => {
        menu.hidePopover();
        if (meta.id !== session.doc.id) void run(() => controller.switchCanvas(meta.id));
      });
      return button;
    }));
  }

  async function run(action: () => Promise<void>) {
    if (busy) return;
    busy = true;
    renderCanvasList();
    buttons.forEach((button) => { button.disabled = true; });
    errorMessage.hidden = true;
    try {
      await action();
    } catch (error) {
      if (settings.open) settings.close();
      if (exportDialog.open) exportDialog.close();
      if (renameDialog.open) renameDialog.close();
      showError(error);
    } finally {
      busy = false;
      renderCanvasList();
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  document.querySelector("#back")!.addEventListener("click", () => {
    void run(async () => {
      await waitForSave(session);
      returnToBookmarks();
    });
  });
  document.querySelector("#canvas-add")!.addEventListener("click", () => {
    menu.hidePopover();
    void run(() => controller.addCanvas());
  });
  function openRename() {
    if (busy) return;
    nameInput.value = canvasName(session.doc);
    nameInput.setCustomValidity("");
    renameDialog.showModal();
    nameInput.select();
  }
  title.addEventListener("dblclick", openRename);
  title.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === "F2") { event.preventDefault(); openRename(); }
  });
  document.querySelector("#rename-cancel")!.addEventListener("click", () => renameDialog.close());
  nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));
  document.querySelector("#rename-form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!nameInput.value.trim()) {
      nameInput.setCustomValidity("Введите название холста");
      nameInput.reportValidity();
      return;
    }
    void run(async () => {
      renameCanvas(session.doc, nameInput.value);
      await waitForSave(session);
      renameDialog.close();
    });
  });
  document.querySelector("#export")!.addEventListener("click", () => {
    menu.hidePopover();
    exportImagesInput.value = "include";
    exportScopeInput.value = "current";
    exportDialog.showModal();
  });
  document.querySelector("#export-cancel")!.addEventListener("click", () => exportDialog.close());
  document.querySelector("#export-form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    const includeImages = exportImagesInput.value === "include";
    const scope = exportScopeInput.value === "all" ? "all" : "current";
    void run(async () => {
      const suffix = `${scope === "all" ? "_all" : ""}${includeImages ? "" : "_without_images"}`;
      download(await exportBackup(session, includeImages, scope), `tablo_canvas_${new Date().toISOString().slice(0, 10)}${suffix}.json`);
      exportDialog.close();
    });
  });
  document.querySelector("#import")!.addEventListener("click", () => {
    menu.hidePopover();
    fileInput.click();
  });
  document.querySelector("#settings")!.addEventListener("click", () => {
    menu.hidePopover();
    const preferences = readCanvasPreferences(session.doc);
    backgroundInput.value = preferences.background;
    snapInput.checked = preferences.snapToGrid;
    guidesInput.checked = preferences.guides;
    openingInput.value = preferences.opening;
    optimizeImagesInput.checked = preferences.optimizeImages;
    toolbarModeInput.value = preferences.toolbarMode;
    settings.showModal();
  });
  document.querySelector("#settings-cancel")!.addEventListener("click", () => settings.close());
  document.querySelector("#settings-form")!.addEventListener("submit", (event) => {
    event.preventDefault();
    void run(async () => {
      saveCanvasPreferences(session.doc, {
        background: backgroundInput.value as CanvasPreferences["background"],
        snapToGrid: snapInput.checked,
        guides: guidesInput.checked,
        opening: openingInput.value as CanvasPreferences["opening"],
        optimizeImages: optimizeImagesInput.checked,
        toolbarMode: toolbarModeInput.value as CanvasPreferences["toolbarMode"],
      });
      await waitForSave(session);
      settings.close();
    });
  });
  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    imageInput.value = "";
    if (!file) return;
    void run(async () => {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
        throw new Error("Выберите PNG, JPEG, WebP или GIF до 10 МБ");
      }
      const ids = await addImages(runtime.editor.std, [file]);
      if (ids.length === 0) throw new Error("Не удалось добавить картинку");
      await waitForSave(session);
    });
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    void run(() => controller.importCanvases(file));
  });
  window.addEventListener("pagehide", () => {
    runtime.dispose();
    stopTheme();
    catalogChanged.dispose();
    session.close();
  }, { once: true });
}
