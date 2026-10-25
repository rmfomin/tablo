// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@blocksuite/sync", async (importOriginal) => {
  const original = await importOriginal<typeof import("@blocksuite/sync")>();
  const Y = await import("yjs");
  const documents = new Map<string, Map<string, Uint8Array>>();
  const assets = new Map<string, Map<string, Blob>>();
  return {
    ...original,
    IndexedDBDocSource: class {
      channel = { close() {} };
      name = "memory";
      data: Map<string, Uint8Array>;
      constructor(name: string) { this.data = documents.get(name) ?? new Map(); documents.set(name, this.data); }
      async pull(id: string, state: Uint8Array) {
        const data = this.data.get(id);
        return data ? { data: state.length ? Y.diffUpdate(data, state) : data, state: Y.encodeStateVectorFromUpdate(data) } : null;
      }
      async push(id: string, value: Uint8Array) { this.data.set(id, Y.mergeUpdates([...(this.data.has(id) ? [this.data.get(id)!] : []), value])); }
      subscribe() { return () => {}; }
    },
    IndexedDBBlobSource: class {
      readonly = false;
      data: Map<string, Blob>;
      constructor(readonly name: string) { this.data = assets.get(name) ?? new Map(); assets.set(name, this.data); }
      async get(id: string) { return this.data.get(id) ?? null; }
      async set(id: string, value: Blob) { this.data.set(id, value); return id; }
      async list() { return [...this.data.keys()]; }
    },
  };
});

import { DocCollection, Text } from "@blocksuite/store";
import { EditPropsStore, type ImageBlockModel } from "@blocksuite/blocks";
import { GfxControllerIdentifier, Viewport } from "@blocksuite/block-std/gfx";
import type { EdgelessEditor } from "@blocksuite/presets";
import { signal } from "@preact/signals-core";
import { exportBackup, openImportSession, openSession, waitForSave, type CanvasSession } from "../storage";
import { IndexedDBBlobSource, IndexedDBDocSource } from "@blocksuite/sync";
import { mountCanvasPreferences, readCanvasPreferences, saveCanvasPreferences } from "../preferences";
import { appendCanvases, canvasName, createCanvas, renameCanvas } from "../canvases";
import { mountCompactToolbar } from "../toolbar";
import { createCanvasController } from "../canvas-controller";

const sessions: CanvasSession[] = [];
afterEach(() => {
  sessions.splice(0).forEach(session => session.close());
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function fixture() {
  const session = await openSession(() => {});
  sessions.push(session);
  const root = session.doc.addBlock("affine:page", { title: new Text("Холст") });
  const surface = session.doc.addBlock("affine:surface", {}, root);
  const sourceId = await session.collection.blobSync.set(new Blob(["GIF89a referenced image"], { type: "image/gif" }));
  const imageId = session.doc.addBlock("affine:image", { sourceId, caption: "Подпись", xywh: "[20,40,320,180]", width: 320, height: 180 }, surface);
  await session.collection.blobSync.set(new Blob(["GIF89a unused image"], { type: "image/gif" }));
  await waitForSave(session);
  return { session, imageId, sourceId };
}

describe("canvas backup images", () => {
  it("rejects an incomplete backup rather than importing broken image references", async () => {
    const { session, sourceId } = await fixture();
    session.activate();
    const backup = JSON.parse(await (await exportBackup(session)).text());
    backup.assets = [];
    await expect(openImportSession(new File([JSON.stringify(backup)], "missing-image.json"))).rejects.toThrow();
    expect(localStorage.getItem("tablo.canvasPrototype.activeCollection.v1")).toBe(session.collection.id);
    expect(await session.collection.blobSync.get(sourceId)).not.toBeNull();
  });

  it("keeps temporary imports in memory and persists copied images after reopening the target", async () => {
    const { session, sourceId } = await fixture();
    session.activate();
    const file = new File([await exportBackup(session)], "copy.json");
    const readDisk = vi.spyOn(IndexedDBDocSource.prototype, "pull");
    const writeDisk = vi.spyOn(IndexedDBDocSource.prototype, "push");
    const writeImage = vi.spyOn(IndexedDBBlobSource.prototype, "set");
    const imported = await openImportSession(file);
    sessions.push(imported);
    expect(readDisk).not.toHaveBeenCalled();
    expect(writeDisk).not.toHaveBeenCalled();
    expect(writeImage).not.toHaveBeenCalled();
    await appendCanvases(session, imported);
    const copyId = session.doc.id;
    session.activate();
    imported.close();
    sessions.splice(sessions.indexOf(imported), 1);
    session.close();
    sessions.splice(sessions.indexOf(session), 1);
    const restored = await openSession(() => {});
    sessions.push(restored);
    expect(restored.doc.id).toBe(copyId);
    expect(restored.collection.meta.docMetas).toHaveLength(2);
    expect(await (await restored.collection.blobSync.get(sourceId))!.text()).toBe("GIF89a referenced image");
  });

  it.each(["invalid JSON", "invalid base64", "invalid active document", "duplicate asset"])(
    "rejects %s without changing the active collection or its data",
    async (corruption) => {
      const { session, sourceId } = await fixture();
      session.activate();
      const active = localStorage.getItem("tablo.canvasPrototype.activeCollection.v1");
      const backup = JSON.parse(await (await exportBackup(session)).text());
      if (corruption === "invalid base64") backup.documents[0].update = "%%%";
      if (corruption === "invalid active document") backup.activeDocId = "missing";
      if (corruption === "duplicate asset") backup.assets.push(backup.assets[0]);
      const text = corruption === "invalid JSON" ? "{broken" : JSON.stringify(backup);
      await expect(openSession(() => {}, new File([text], "broken.json"))).rejects.toThrow();
      expect(localStorage.getItem("tablo.canvasPrototype.activeCollection.v1")).toBe(active);
      expect(canvasName(session.doc)).toBe("Холст");
      expect(await (await session.collection.blobSync.get(sourceId))!.text()).toBe("GIF89a referenced image");
    },
  );

  it("includes only referenced image data and keeps legacy import working", async () => {
    const { session, imageId, sourceId } = await fixture();
    const backup = JSON.parse(await (await exportBackup(session)).text());
    expect(backup.assets).toHaveLength(1);
    expect(backup.assets[0].id).toBe(sourceId);
    delete backup.imagesIncluded;
    delete backup.activeDocId;
    backup.version = 1;
    const imported = await openSession(() => {}, new File([JSON.stringify(backup)], "legacy.json"));
    sessions.push(imported);
    expect((imported.doc.getBlock(imageId)?.model as ImageBlockModel).sourceId).toBe(sourceId);
    expect(await (await imported.collection.blobSync.get(sourceId))!.text()).toBe("GIF89a referenced image");
  });

  it("omits image bytes without modifying the original and restores a labelled placeholder", async () => {
    const { session, imageId, sourceId } = await fixture();
    const backupBlob = await exportBackup(session, false);
    const backup = JSON.parse(await backupBlob.text());
    expect(backup.imagesIncluded).toBe(false);
    expect(backup.assets).toEqual([]);
    expect((session.doc.getBlock(imageId)?.model as ImageBlockModel).sourceId).toBe(sourceId);
    expect(await session.collection.blobSync.get(sourceId)).not.toBeNull();
    const imported = await openSession(() => {}, new File([backupBlob], "without-images.json"));
    sessions.push(imported);
    const image = imported.doc.getBlock(imageId)!.model as ImageBlockModel;
    expect(image.xywh).toBe("[20,40,320,180]");
    expect(image.caption).toBe("Подпись");
    expect(image.sourceId).not.toBe(sourceId);
    expect(await (await imported.collection.blobSync.get(image.sourceId!))!.text()).toContain("Картинка не включена в экспорт");
  });

  it("applies the live optimization preference to blob insertion, including clipboard paths", async () => {
    const { session } = await fixture();
    const close = vi.fn();
    const drawImage = vi.fn();
    const bitmap = { width: 4000, height: 2000, close };
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => tag === "canvas" ? {
      width: 0, height: 0, getContext: () => ({ drawImage }),
      toBlob: (callback: (value: Blob) => void) => callback(new Blob(["small webp"], { type: "image/webp" })),
    } : createElement(tag)) as typeof document.createElement);
    vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
    const original = new Blob([new Uint8Array(1000)], { type: "image/jpeg" });
    const id = await session.collection.blobSync.set(original);
    expect((await session.collection.blobSync.get(id))!.type).toBe("image/webp");
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1920, 960);
    const preferences = readCanvasPreferences(session.doc);
    saveCanvasPreferences(session.doc, { ...preferences, optimizeImages: false });
    const originalId = await session.collection.blobSync.set(original);
    expect((await session.collection.blobSync.get(originalId))!.type).toBe("image/jpeg");
    expect(close).toHaveBeenCalledOnce();
    const backup = await exportBackup(session);
    const imported = await openSession(() => {}, new File([backup], "settings.json"));
    sessions.push(imported);
    expect(readCanvasPreferences(imported.doc).optimizeImages).toBe(false);
  });

  it("can export without images even when an original image blob is unavailable", async () => {
    const { session } = await fixture();
    const get = vi.spyOn(session.collection.blobSync, "get").mockResolvedValue(null);
    const backup = JSON.parse(await (await exportBackup(session, false)).text());
    expect(backup.assets).toEqual([]);
    expect(get).not.toHaveBeenCalled();
    await expect(exportBackup(session, true)).rejects.toThrow("Не удалось прочитать");
  });
});

describe("multiple canvases", () => {
  it("restores the selected and active canvas when mounting the next editor fails", async () => {
    const { session } = await fixture();
    session.activate();
    const firstId = session.doc.id;
    const second = createCanvas(session);
    const visited: string[] = [];
    const mount = vi.fn(async () => {
      visited.push(session.doc.id);
      if (session.doc.id === second.id) throw new Error("Editor failed");
    });
    const controller = createCanvasController(session, mount);
    await expect(controller.switchCanvas(second.id)).rejects.toThrow("Editor failed");
    expect(session.doc.id).toBe(firstId);
    expect(visited).toEqual([second.id, firstId]);
    expect(localStorage.getItem(`tablo.canvasPrototype.activeDoc.v1:${session.collection.id}`)).toBe(firstId);
  });

  it("does not switch away when the current image write fails", async () => {
    const { session } = await fixture();
    const firstId = session.doc.id;
    const second = createCanvas(session);
    vi.spyOn(session, "waitForAssets").mockRejectedValue(new Error("Quota exceeded"));
    const mount = vi.fn();
    await expect(createCanvasController(session, mount).switchCanvas(second.id)).rejects.toThrow("Quota exceeded");
    expect(session.doc.id).toBe(firstId);
    expect(mount).not.toHaveBeenCalled();
  });

  it("rolls back added canvases when their editor cannot be mounted", async () => {
    const { session } = await fixture();
    const firstId = session.doc.id;
    const mount = vi.fn().mockRejectedValueOnce(new Error("Editor failed")).mockResolvedValue(undefined);
    await expect(createCanvasController(session, mount).addCanvas()).rejects.toThrow("Editor failed");
    expect(session.doc.id).toBe(firstId);
    expect(session.collection.meta.docMetas.map(meta => meta.id)).toEqual([firstId]);
  });

  it("rolls back an imported set if mounting fails after a successful copy", async () => {
    const { session } = await fixture();
    const firstId = session.doc.id;
    const file = new File([await exportBackup(session)], "import.json");
    const mount = vi.fn().mockRejectedValueOnce(new Error("Editor failed")).mockResolvedValue(undefined);
    await expect(createCanvasController(session, mount).importCanvases(file)).rejects.toThrow("Editor failed");
    expect(session.doc.id).toBe(firstId);
    expect(session.collection.meta.docMetas.map(meta => meta.id)).toEqual([firstId]);
  });

  it("keeps canvases added concurrently when rolling back a failed import", async () => {
    const { session } = await fixture();
    const originalId = session.doc.id;
    const file = new File([await exportBackup(session)], "import.json");
    let rejectMount!: (error: unknown) => void;
    const blocked = new Promise<void>((_, reject) => { rejectMount = reject; });
    const mount = vi.fn().mockReturnValueOnce(blocked).mockResolvedValue(undefined);
    const operation = createCanvasController(session, mount).importCanvases(file);
    const failed = expect(operation).rejects.toThrow("Mount failed");
    await vi.waitFor(() => expect(mount).toHaveBeenCalledOnce());
    const unrelated = createCanvas(session);
    renameCanvas(unrelated, "Из другой вкладки");
    rejectMount(new Error("Mount failed"));
    await failed;
    expect(session.doc.id).toBe(originalId);
    expect(session.collection.getDoc(unrelated.id)).toBeDefined();
    expect(session.collection.meta.docMetas.map(meta => meta.id)).toEqual([originalId, unrelated.id]);
  });

  it("switches toolbar modes live and preserves the shared choice through both export scopes", async () => {
    const { session } = await fixture();
    expect(readCanvasPreferences(session.doc).toolbarMode).toBe("compact");
    const second = createCanvas(session);
    const tools = { currentToolName$: signal("default"), currentToolOption$: signal({ type: "default" }), setTool: vi.fn() };
    const gfx = { tool: tools, viewport: new Viewport(), elementsBound: null };
    const editor = Object.assign(document.createElement("edgeless-editor"), {
      doc: session.doc,
      std: { get: (id: unknown) => {
        if (id === GfxControllerIdentifier) return gfx;
        if (id === EditPropsStore) return { lastProps$: signal({}), recordLastProps: vi.fn() };
        throw new Error("Unexpected service");
      } },
    }) as unknown as EdgelessEditor;
    const host = document.createElement("nav");
    host.id = "canvas-toolbar";
    document.body.append(host, editor);
    const stopPreferences = mountCanvasPreferences(editor);
    const stopToolbar = mountCompactToolbar(editor, vi.fn());
    try {
      const firstButton = host.querySelector("button");
      expect(host.hidden).toBe(false);
      expect(editor.dataset.toolbarMode).toBe("compact");
      saveCanvasPreferences(second, { ...readCanvasPreferences(second), toolbarMode: "detailed" });
      expect(host.hidden).toBe(true);
      expect(editor.dataset.toolbarMode).toBe("detailed");
      expect(readCanvasPreferences(session.doc).toolbarMode).toBe("detailed");
      for (const scope of ["current", "all"] as const) {
        const backup = await exportBackup(session, false, scope);
        const restored = await openSession(() => {}, new File([backup], `${scope}.json`));
        sessions.push(restored);
        expect(readCanvasPreferences(restored.doc).toolbarMode).toBe("detailed");
      }
      saveCanvasPreferences(session.doc, { ...readCanvasPreferences(session.doc), toolbarMode: "compact" });
      expect(host.hidden).toBe(false);
      expect(editor.dataset.toolbarMode).toBe("compact");
      expect(host.querySelector("button")).toBe(firstButton);
    } finally {
      stopToolbar();
      stopPreferences();
      host.remove();
      editor.remove();
    }
  });

  it("migrates settings from a legacy single-canvas file to the shared settings map", async () => {
    const { session } = await fixture();
    const backup = JSON.parse(await (await exportBackup(session)).text());
    const legacySettings = { ...readCanvasPreferences(session.doc), background: "none", guides: false };
    session.collection.doc.getMap("tablo:canvas-preferences:v1").delete("settings");
    session.doc.spaceDoc.getMap("tablo:canvas-preferences:v1").set("settings", legacySettings);
    const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
    backup.root = encode(DocCollection.Y.encodeStateAsUpdate(session.collection.doc));
    backup.documents[0].update = encode(DocCollection.Y.encodeStateAsUpdate(session.doc.spaceDoc));
    backup.version = 1;
    delete backup.activeDocId;
    const restored = await openSession(() => {}, new File([JSON.stringify(backup)], "old.json"));
    sessions.push(restored);
    expect(readCanvasPreferences(restored.doc).background).toBe("none");
    const second = createCanvas(restored);
    expect(readCanvasPreferences(second).background).toBe("none");
    expect(readCanvasPreferences(second).guides).toBe(false);
  });

  it("starts with exactly one canvas and keeps global preferences across creation and switching", async () => {
    const { session } = await fixture();
    expect(session.collection.meta.docMetas).toHaveLength(1);
    const first = session.doc;
    saveCanvasPreferences(first, { ...readCanvasPreferences(first), background: "lines", optimizeImages: false });
    const second = createCanvas(session);
    expect(canvasName(second)).toBe("Холст 2");
    expect(second.getBlockByFlavour("affine:note")).toHaveLength(0);
    session.selectCanvas(second.id);
    expect(readCanvasPreferences(session.doc).background).toBe("lines");
    saveCanvasPreferences(second, { ...readCanvasPreferences(second), snapToGrid: true });
    session.selectCanvas(first.id);
    expect(readCanvasPreferences(first).snapToGrid).toBe(true);
    expect(readCanvasPreferences(first).optimizeImages).toBe(false);
    renameCanvas(second, "Схема интерфейса");
    expect(canvasName(second)).toBe("Схема интерфейса");
    expect(session.collection.meta.getDocMeta(second.id)!.title).toBe("Схема интерфейса");
    expect(() => renameCanvas(second, "   ")).toThrow();
    expect(canvasName(first)).toBe("Холст");
  });

  it("restores all canvases and the last active canvas without mixing their contents", async () => {
    const { session, imageId } = await fixture();
    const firstId = session.doc.id;
    const second = createCanvas(session);
    renameCanvas(second, "Второй");
    session.selectCanvas(second.id);
    session.activate();
    await waitForSave(session);
    session.close();
    sessions.splice(sessions.indexOf(session), 1);
    const restored = await openSession(() => {});
    sessions.push(restored);
    expect(restored.collection.meta.docMetas).toHaveLength(2);
    expect(restored.doc.id).toBe(second.id);
    expect(canvasName(restored.doc)).toBe("Второй");
    expect(restored.doc.getBlock(imageId)).toBeUndefined();
    restored.selectCanvas(firstId);
    expect(restored.doc.getBlock(imageId)).toBeDefined();
  });

  it("exports only current canvas metadata and referenced assets when current scope is selected", async () => {
    const { session } = await fixture();
    const second = createCanvas(session);
    renameCanvas(session.doc, "Не экспортировать этот холст");
    session.selectCanvas(second.id);
    const backup = await exportBackup(session, true, "current");
    const parsed = JSON.parse(await backup.text());
    expect(parsed.documents).toHaveLength(1);
    expect(parsed.assets).toEqual([]);
    const imported = await openSession(() => {}, new File([backup], "current.json"));
    sessions.push(imported);
    expect(imported.collection.meta.docMetas).toHaveLength(1);
    expect(imported.doc.id).toBe(second.id);
    expect(imported.collection.meta.docMetas[0].title).toBe("Холст 2");
  });

  it("exports and restores all canvases, deduplicates shared images, and supports omitted images", async () => {
    const { session, sourceId } = await fixture();
    const second = createCanvas(session);
    const surface = second.getBlockByFlavour("affine:surface")[0];
    second.addBlock("affine:image", { sourceId, xywh: "[0,0,320,180]", width: 320, height: 180 }, surface);
    session.selectCanvas(second.id);
    for (const includeImages of [true, false]) {
      const backup = await exportBackup(session, includeImages, "all");
      const parsed = JSON.parse(await backup.text());
      expect(parsed.documents).toHaveLength(2);
      expect(parsed.assets).toHaveLength(includeImages ? 1 : 0);
      const restored = await openSession(() => {}, new File([backup], "all.json"));
      sessions.push(restored);
      expect(restored.doc.id).toBe(second.id);
      expect(restored.collection.meta.docMetas).toHaveLength(2);
      for (const meta of restored.collection.meta.docMetas) {
        const image = restored.collection.getDoc(meta.id)!.getBlockByFlavour("affine:image")[0] as ImageBlockModel;
        const blob = await restored.collection.blobSync.get(image.sourceId!);
        expect(blob).not.toBeNull();
        expect(blob!.type).toBe(includeImages ? "image/gif" : "image/svg+xml");
      }
    }
  });

  it("adds imported canvases as independent copies and preserves the existing set and settings", async () => {
    const { session } = await fixture();
    saveCanvasPreferences(session.doc, { ...readCanvasPreferences(session.doc), background: "lines" });
    const originalId = session.doc.id;
    const imported = await openSession(() => {}, new File([await exportBackup(session)], "copy.json"));
    sessions.push(imported);
    saveCanvasPreferences(imported.doc, { ...readCanvasPreferences(imported.doc), background: "none" });
    await appendCanvases(session, imported);
    expect(session.collection.meta.docMetas).toHaveLength(2);
    expect(session.doc.id).not.toBe(originalId);
    expect(session.collection.getDoc(originalId)!.root).not.toBeNull();
    expect(readCanvasPreferences(session.doc).background).toBe("lines");
    const firstCopyId = session.doc.id;
    await appendCanvases(session, imported);
    expect(session.collection.meta.docMetas).toHaveLength(3);
    expect(session.doc.id).not.toBe(firstCopyId);
    renameCanvas(session.doc, "Копия");
    expect(canvasName(session.collection.getDoc(originalId)!)).toBe("Холст");
  });

  it("rejects duplicate document IDs before activating an import", async () => {
    const { session } = await fixture();
    session.activate();
    const backup = JSON.parse(await (await exportBackup(session)).text());
    backup.documents.push(backup.documents[0]);
    const activeCollection = localStorage.getItem("tablo.canvasPrototype.activeCollection.v1");
    await expect(openSession(() => {}, new File([JSON.stringify(backup)], "broken.json"))).rejects.toThrow();
    expect(localStorage.getItem("tablo.canvasPrototype.activeCollection.v1")).toBe(activeCollection);
  });

  it("keeps the current canvases intact when copying imported assets fails", async () => {
    const { session } = await fixture();
    const id = session.doc.id;
    const imported = await openSession(() => {}, new File([await exportBackup(session)], "copy.json"));
    sessions.push(imported);
    vi.spyOn(imported.collection.blobSync, "get").mockRejectedValue(new Error("Read failed"));
    await expect(appendCanvases(session, imported)).rejects.toThrow("Read failed");
    expect(session.doc.id).toBe(id);
    expect(session.collection.meta.docMetas).toHaveLength(1);
    expect(session.doc.root).toBeDefined();
  });

  it.each(["bytes", "MIME"])("rejects conflicting asset %s before any writes to the original canvases", async (conflict) => {
    const { session, sourceId } = await fixture();
    session.activate();
    const originalId = session.doc.id;
    const backup = JSON.parse(await (await exportBackup(session)).text());
    if (conflict === "bytes") backup.assets[0].data = btoa("GIF89a referenced imagX");
    else backup.assets[0].mimeType = "image/png";
    backup.assets.unshift({ id: "unreferenced-import-asset", mimeType: "image/gif", data: btoa("GIF89a new image") });
    const imported = await openImportSession(new File([JSON.stringify(backup)], "collision.json"));
    sessions.push(imported);
    const write = vi.spyOn(session.collection.blobSync, "set");
    await expect(appendCanvases(session, imported)).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
    expect(session.doc.id).toBe(originalId);
    expect(session.collection.meta.docMetas).toHaveLength(1);
    expect(await (await session.collection.blobSync.get(sourceId))!.text()).toBe("GIF89a referenced image");
  });
});
