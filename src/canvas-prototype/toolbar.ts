import { GfxControllerIdentifier } from "@blocksuite/block-std/gfx";
import {
  ConnectorMode,
  EditPropsStore,
  ShapeType,
  ThemeProvider,
  type ShapeName,
} from "@blocksuite/blocks";
import type { EdgelessEditor } from "@blocksuite/presets";
import { subscribeCanvasTheme } from "./theme";
import { subscribeCanvasPreferences } from "./preferences";

const icons = {
  select: '<path d="m5 3 14 9-7 1-3 7z"/>',
  pan: '<path d="M8 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-4a2 2 0 0 1 4 0v7c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2"/>',
  note: '<path d="M5 3h14a2 2 0 0 1 2 2v10l-6 6H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M15 21v-6h6M7 8h10M7 12h6"/>',
  text: '<path d="M4 6V3h16v3M12 3v18M8 21h8"/>',
  shape: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  connector: '<path d="M4 19 20 3M12 3h8v8"/>',
  brush: '<path d="m15 3 6 6-11 11-7 1 1-7zM12 6l6 6M4 14l6 6"/>',
  eraser: '<path d="m15 3 6 6-12 12H5l-3-3a2 2 0 0 1 0-3L14 3a1 1 0 0 1 1 0ZM8 9l7 7M9 21h12"/>',
  frame: '<path d="M7 2v20M17 2v20M2 7h20M2 17h20"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  undo: '<path d="m8 4-5 5 5 5M3 9h10a6 6 0 0 1 0 12"/>',
  redo: '<path d="m16 4 5 5-5 5M21 9H11a6 6 0 0 0 0 12"/>',
};

function iconButton(label: string, icon: keyof typeof icons) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tool-button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[icon]}</svg>`;
  return button;
}

function selectControl(label: string, options: [string, string][]) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", label);
  select.title = label;
  for (const [value, text] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  return select;
}

export function mountCompactToolbar(editor: EdgelessEditor, addImage: () => void) {
  const host = document.querySelector<HTMLElement>("#canvas-toolbar")!;
  const tools = editor.std.get(GfxControllerIdentifier).tool;
  const props = editor.std.get(EditPropsStore);
  const main = document.createElement("div");
  main.className = "tool-buttons";
  main.setAttribute("role", "toolbar");
  main.setAttribute("aria-label", "Инструменты холста");
  const options = document.createElement("div");
  options.className = "tool-options";
  options.setAttribute("role", "group");
  options.setAttribute("aria-label", "Параметры инструмента");
  options.hidden = true;

  const shape = selectControl("Форма фигуры", [
    [ShapeType.Rect, "Прямоугольник"], ["roundedRect", "Скруглённый"],
    [ShapeType.Ellipse, "Эллипс"], [ShapeType.Diamond, "Ромб"], [ShapeType.Triangle, "Треугольник"],
  ]);
  const connector = selectControl("Тип соединения", [
    [String(ConnectorMode.Straight), "Прямая стрелка"],
    [String(ConnectorMode.Orthogonal), "Угловая стрелка"],
    [String(ConnectorMode.Curve), "Изогнутая стрелка"],
  ]);
  const width = selectControl("Толщина пера", [["2", "2 px"], ["4", "4 px"], ["6", "6 px"], ["10", "10 px"], ["16", "16 px"]]);
  const color = document.createElement("input");
  color.type = "color";
  color.setAttribute("aria-label", "Цвет пера");
  color.title = "Цвет пера";

  function focusEditor() {
    editor.host?.querySelector<HTMLElement>("[contenteditable='true']")?.focus({ preventScroll: true });
  }

  const buttons = new Map<string, HTMLButtonElement>();
  function addTool(name: string, label: string, icon: keyof typeof icons, activate: () => void) {
    const button = iconButton(label, icon);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => { activate(); focusEditor(); });
    main.append(button);
    buttons.set(name, button);
  }
  addTool("default", "Выделение (V)", "select", () => tools.setTool("default"));
  addTool("pan", "Перемещение холста (H)", "pan", () => tools.setTool("pan", { panning: false }));
  addTool("affine:note", "Карточка (N)", "note", () => tools.setTool("affine:note", {
    childFlavour: "affine:paragraph", childType: "text", tip: "Нажмите или потяните, чтобы создать карточку",
  }));
  addTool("text", "Текст (T)", "text", () => tools.setTool("text"));
  addTool("shape", "Фигура", "shape", () => tools.setTool("shape", { shapeName: shape.value as ShapeName }));
  addTool("connector", "Соединение (C)", "connector", () => tools.setTool("connector", { mode: Number(connector.value) as ConnectorMode }));
  addTool("brush", "Перо (P)", "brush", () => tools.setTool("brush"));
  addTool("eraser", "Ластик (E)", "eraser", () => tools.setTool("eraser"));
  addTool("frame", "Рамка (F)", "frame", () => tools.setTool("frame"));
  const image = iconButton("Добавить картинку", "image");
  image.addEventListener("click", addImage);
  main.append(image);
  const separator = document.createElement("span");
  separator.className = "tool-divider";
  separator.setAttribute("aria-hidden", "true");
  const undo = iconButton("Отменить", "undo");
  const redo = iconButton("Повторить", "redo");
  undo.addEventListener("click", () => { editor.doc.undo(); focusEditor(); });
  redo.addEventListener("click", () => { editor.doc.redo(); focusEditor(); });
  main.append(separator, undo, redo);

  shape.addEventListener("change", () => { tools.setTool("shape", { shapeName: shape.value as ShapeName }); focusEditor(); });
  connector.addEventListener("change", () => { tools.setTool("connector", { mode: Number(connector.value) as ConnectorMode }); focusEditor(); });
  color.addEventListener("input", () => { props.recordLastProps("brush", { color: { normal: color.value } }); });
  width.addEventListener("change", () => { props.recordLastProps("brush", { lineWidth: Number(width.value) }); focusEditor(); });

  function updateTools(name: string) {
    for (const [toolName, button] of buttons) {
      button.setAttribute("aria-pressed", String(toolName === name));
    }
    options.replaceChildren();
    const toolOptions = tools.currentToolOption$.peek();
    if (name === "shape") {
      if (toolOptions.type === "shape") shape.value = toolOptions.shapeName;
      options.append(shape);
    }
    if (name === "connector") {
      if (toolOptions.type === "connector") connector.value = String(toolOptions.mode);
      options.append(connector);
    }
    if (name === "brush") {
      width.value = String(props.lastProps$.value.brush.lineWidth);
      const value = editor.std.get(ThemeProvider).getColorValue(props.lastProps$.value.brush.color, "#2563eb", true);
      const context = document.createElement("canvas").getContext("2d");
      if (context) {
        context.fillStyle = value;
        color.value = context.fillStyle;
      }
      options.append(color, width);
    }
    options.hidden = options.childElementCount === 0;
  }
  host.replaceChildren(options, main);
  const stopPreferences = subscribeCanvasPreferences(editor.doc, ({ toolbarMode }) => {
    host.hidden = toolbarMode !== "compact";
  });
  const stopTool = tools.currentToolName$.subscribe((name) => updateTools(name));
  const stopUndo = editor.doc.blockCollection.canUndo$.subscribe((canUndo) => { undo.disabled = !canUndo; });
  const stopRedo = editor.doc.blockCollection.canRedo$.subscribe((canRedo) => { redo.disabled = !canRedo; });
  const stopTheme = subscribeCanvasTheme(() => updateTools(tools.currentToolName$.peek()));
  return () => {
    stopTool();
    stopUndo();
    stopRedo();
    stopTheme();
    stopPreferences();
    host.replaceChildren();
    host.hidden = true;
  };
}
