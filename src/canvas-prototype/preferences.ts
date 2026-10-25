import type { ExtensionType } from "@blocksuite/block-std";
import { GfxControllerIdentifier } from "@blocksuite/block-std/gfx";
import { EdgelessSnapManager, OverlayIdentifier } from "@blocksuite/blocks";
import type { EdgelessEditor } from "@blocksuite/presets";
import type { Doc } from "@blocksuite/store";
import { showError } from "./errors";

export type CanvasPreferences = {
  background: "dots" | "lines" | "none";
  snapToGrid: boolean;
  guides: boolean;
  opening: "restore" | "fit";
  optimizeImages: boolean;
  toolbarMode: "compact" | "detailed";
};

const gridStep = 20;
const preferencesKey = "tablo:canvas-preferences:v1";
const defaults: CanvasPreferences = { background: "dots", snapToGrid: false, guides: true, opening: "restore", optimizeImages: true, toolbarMode: "compact" };

function preferencesMap(doc: Doc) {
  const shared = doc.collection.doc.getMap<CanvasPreferences>(preferencesKey);
  if (!shared.has("settings")) {
    const legacy = doc.spaceDoc.getMap<CanvasPreferences>(preferencesKey).get("settings");
    if (legacy) shared.set("settings", legacy);
  }
  return shared;
}

export function readCanvasPreferences(doc: Doc): CanvasPreferences {
  const value = preferencesMap(doc).get("settings");
  return {
    background: value?.background === "lines" || value?.background === "none" ? value.background : defaults.background,
    snapToGrid: typeof value?.snapToGrid === "boolean" ? value.snapToGrid : defaults.snapToGrid,
    guides: typeof value?.guides === "boolean" ? value.guides : defaults.guides,
    opening: value?.opening === "fit" ? "fit" : defaults.opening,
    optimizeImages: typeof value?.optimizeImages === "boolean" ? value.optimizeImages : defaults.optimizeImages,
    toolbarMode: value?.toolbarMode === "detailed" ? "detailed" : defaults.toolbarMode,
  };
}

export function saveCanvasPreferences(doc: Doc, value: CanvasPreferences) {
  preferencesMap(doc).set("settings", value);
}

export function subscribeCanvasPreferences(doc: Doc, listener: (preferences: CanvasPreferences) => void) {
  const map = preferencesMap(doc);
  const update = () => listener(readCanvasPreferences(doc));
  map.observe(update);
  update();
  return () => map.unobserve(update);
}

// Публичная точка расширения BlockSuite: добавляем сетку к штатному выравниванию
class CanvasSnapManager extends EdgelessSnapManager {
  override align(bound: Parameters<EdgelessSnapManager["align"]>[0]) {
    const preferences = readCanvasPreferences(this.gfx.doc);
    const aligned = bound.clone();
    if (preferences.snapToGrid) {
      aligned.x = Math.round(bound.x / gridStep) * gridStep;
      aligned.y = Math.round(bound.y / gridStep) * gridStep;
    }
    const guides = preferences.guides ? super.align(aligned) : { dx: 0, dy: 0 };
    return { dx: aligned.x - bound.x + guides.dx, dy: aligned.y - bound.y + guides.dy };
  }

  override render(context: CanvasRenderingContext2D) {
    if (readCanvasPreferences(this.gfx.doc).guides) super.render(context);
  }
}

export const canvasPreferencesExtension: ExtensionType = {
  setup(di) {
    di.override(OverlayIdentifier("snap-manager"), (provider) => new CanvasSnapManager(provider.get(GfxControllerIdentifier)));
  },
};

type SavedViewport = { zoom: number; centerX: number; centerY: number };

function readViewport(key: string): SavedViewport | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      value && Number.isFinite(value.zoom) && value.zoom >= 0.1 && value.zoom <= 6 &&
      Number.isFinite(value.centerX) && Number.isFinite(value.centerY)
    ) return { zoom: value.zoom, centerX: value.centerX, centerY: value.centerY };
  } catch {
    // Повреждённая или недоступная запись не мешает открыть весь холст
  }
  return undefined;
}

export function mountCanvasPreferences(editor: EdgelessEditor) {
  const gfx = editor.std.get(GfxControllerIdentifier);
  const { viewport } = gfx;
  const viewportKey = `tablo.canvasViewport.v1:${editor.doc.collection.id}:${editor.doc.id}`;
  const preferences = preferencesMap(editor.doc);
  function applyPreferences() {
    const value = readCanvasPreferences(editor.doc);
    editor.dataset.canvasBackground = value.background;
    editor.dataset.toolbarMode = value.toolbarMode;
  }
  function updateGrid() {
    editor.style.setProperty("--canvas-grid-size", `${gridStep * viewport.zoom}px`);
  }
  applyPreferences();
  updateGrid();
  const saved = readCanvasPreferences(editor.doc).opening === "restore" ? readViewport(viewportKey) : undefined;
  if (saved) {
    viewport.setViewport(saved.zoom, [saved.centerX, saved.centerY]);
  } else {
    const bounds = gfx.elementsBound;
    const fit = bounds ? viewport.getFitToScreenData(bounds, [64, 24, 72, 24], 1, 40) : { zoom: 1, centerX: 0, centerY: 0 };
    viewport.setViewport(fit.zoom, [fit.centerX, fit.centerY]);
  }
  updateGrid();

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let reportedSaveError = false;
  function saveViewport() {
    clearTimeout(saveTimer);
    try {
      localStorage.setItem(viewportKey, JSON.stringify({ zoom: viewport.zoom, centerX: viewport.centerX, centerY: viewport.centerY }));
    } catch {
      if (!reportedSaveError) showError(new Error("Не удалось запомнить позицию холста в этом браузере"));
      reportedSaveError = true;
    }
  }
  preferences.observe(applyPreferences);
  const changed = viewport.viewportUpdated.on(() => {
    updateGrid();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveViewport, 150);
  });
  // Сохраняем также начальный вид и последнюю позицию перед закрытием
  saveViewport();
  return () => {
    changed.dispose();
    preferences.unobserve(applyPreferences);
    saveViewport();
  };
}
