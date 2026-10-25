import { DocCollection, Schema } from "@blocksuite/store";
import { AffineSchemas, type RootBlockModel } from "@blocksuite/blocks";
import type { CanvasSession } from "./storage";
import { readCanvasPreferences, saveCanvasPreferences } from "./preferences";

const format = "tablo-canvas-prototype";
const maxBackupBytes = 64 * 1024 * 1024;

type CanvasBackup = {
  format: typeof format;
  version: 1 | 2;
  engine: "blocksuite@0.19.5";
  root: string;
  documents: { id: string; update: string }[];
  assets: { id: string; mimeType: string; data: string }[];
  imagesIncluded?: boolean;
  activeDocId?: string;
};

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

export function decode(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readBackup(file: File): Promise<CanvasBackup> {
  if (file.size > maxBackupBytes) throw new Error("Для прототипа допустим JSON до 64 МБ");
  const data: unknown = JSON.parse(await file.text());
  if (
    !isRecord(data) || data.format !== format || (data.version !== 1 && data.version !== 2) ||
    data.engine !== "blocksuite@0.19.5" || typeof data.root !== "string" ||
    !Array.isArray(data.documents) || data.documents.length === 0 ||
    (data.version === 1 && data.documents.length !== 1) ||
    !Array.isArray(data.assets) ||
    (data.imagesIncluded !== undefined && typeof data.imagesIncluded !== "boolean") ||
    (data.imagesIncluded === false && data.assets.length > 0)
  ) throw new Error("Выберите JSON, экспортированный из этого прототипа холста");

  DocCollection.Y.decodeUpdate(decode(data.root));
  const documentIds = new Set<string>();
  for (const doc of data.documents) {
    if (!isRecord(doc) || typeof doc.id !== "string" || !doc.id || typeof doc.update !== "string" || documentIds.has(doc.id)) {
      throw new Error("В файле повреждены данные холста");
    }
    documentIds.add(doc.id);
    DocCollection.Y.decodeUpdate(decode(doc.update));
  }
  if (data.activeDocId !== undefined && (typeof data.activeDocId !== "string" || !documentIds.has(data.activeDocId))) {
    throw new Error("В файле повреждён список холстов");
  }
  const assetIds = new Set<string>();
  for (const asset of data.assets) {
    if (
      !isRecord(asset) || typeof asset.id !== "string" || !asset.id ||
      typeof asset.mimeType !== "string" || typeof asset.data !== "string" ||
      assetIds.has(asset.id)
    ) throw new Error("В файле повреждены изображения");
    assetIds.add(asset.id);
    decode(asset.data);
  }
  return data as CanvasBackup;
}

export async function exportBackup(session: CanvasSession, includeImages = true, scope: "current" | "all" = "current"): Promise<Blob> {
  // Экспортируем живой документ, даже если запись в IndexedDB завершилась ошибкой
  const assets: CanvasBackup["assets"] = [];
  await session.waitForAssets();
  const docs = scope === "all" ? session.collection.meta.docMetas.map(meta => session.collection.getDoc(meta.id)!) : [session.doc];
  // Собираем отдельный корневой документ: экспорт текущего не содержит метаданных остальных холстов
  const exported = new DocCollection({ id: crypto.randomUUID(), schema: new Schema().register(AffineSchemas) });
  exported.meta.initialize();
  for (const doc of docs) {
    exported.createDoc({ id: doc.id });
    exported.setDocMeta(doc.id, { title: (doc.root as RootBlockModel).title.toString() });
  }
  saveCanvasPreferences(exported.getDoc(docs[0].id)!, readCanvasPreferences(session.doc));
  const root = encode(DocCollection.Y.encodeStateAsUpdate(exported.doc));
  exported.forceStop();
  exported.dispose();
  exported.doc.destroy();
  const sourceIds = new Set(
    docs.flatMap(doc => Object.values(doc.blocks.peek())).flatMap(({ model }) => {
      if (!("sourceId" in model) || typeof model.sourceId !== "string" || !model.sourceId) return [];
      return [model.sourceId];
    }),
  );
  for (const id of includeImages ? sourceIds : []) {
    const blob = await session.collection.blobSync.get(id);
    if (!blob) throw new Error("Не удалось прочитать одно из изображений. Экспорт прерван");
    assets.push({ id, mimeType: blob.type, data: encode(new Uint8Array(await blob.arrayBuffer())) });
  }
  const backup: CanvasBackup = {
    format,
    version: 2,
    engine: "blocksuite@0.19.5",
    root,
    documents: docs.map(doc => ({ id: doc.id, update: encode(DocCollection.Y.encodeStateAsUpdate(doc.spaceDoc)) })),
    assets,
    imagesIncluded: includeImages,
    activeDocId: session.doc.id,
  };
  return new Blob([JSON.stringify(backup)], { type: "application/json" });
}
