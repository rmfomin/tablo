import { Text, type Doc } from "@blocksuite/store";
import type { RootBlockModel } from "@blocksuite/blocks";
import type { CanvasSession } from "./storage";
import { DocCollection } from "@blocksuite/store";
import { waitForSave } from "./storage";

async function equalBlobs(first: Blob, second: Blob) {
  if (first.type !== second.type || first.size !== second.size) return false;
  const a = new Uint8Array(await first.arrayBuffer());
  const b = new Uint8Array(await second.arrayBuffer());
  return a.every((value, index) => value === b[index]);
}

export function canvasName(doc: Doc) {
  return (doc.root as RootBlockModel | null)?.title.toString().trim() || "Холст";
}

export function initializeCanvas(doc: Doc, name: string) {
  const root = doc.addBlock("affine:page", { title: new Text(name) });
  doc.addBlock("affine:surface", {}, root);
  doc.collection.setDocMeta(doc.id, { title: name });
  doc.resetHistory();
}

export function createCanvas(session: CanvasSession) {
  const names = new Set(session.collection.meta.docMetas.map(meta => meta.title));
  let number = session.collection.meta.docMetas.length + 1;
  while (names.has(`Холст ${number}`)) number++;
  const doc = session.collection.createDoc();
  doc.load();
  initializeCanvas(doc, `Холст ${number}`);
  return doc;
}

export function renameCanvas(doc: Doc, value: string) {
  const name = value.trim();
  if (!name || name.length > 120) throw new Error("Введите название холста от 1 до 120 символов");
  const title = (doc.root as RootBlockModel).title;
  if (title.toString() === name) return;
  doc.captureSync();
  title.replace(0, title.length, name);
  doc.collection.setDocMeta(doc.id, { title: name });
  doc.captureSync();
}

export async function appendCanvases(target: CanvasSession, imported: CanvasSession) {
  const created: string[] = [];
  const originalId = target.doc.id;
  try {
    // Проверяем все совпадения ключей до первой записи, чтобы не заменить исходные картинки
    const images: { id: string; blob: Blob }[] = [];
    for (const id of await imported.collection.blobSync.list()) {
      const blob = await imported.collection.blobSync.get(id);
      if (!blob) throw new Error("Не удалось прочитать картинку импортируемого холста");
      const existing = await target.collection.blobSync.get(id);
      if (existing) {
        if (!await equalBlobs(existing, blob)) throw new Error("В импорте найден конфликт изображений. Исходные холсты сохранены");
      } else images.push({ id, blob });
    }
    for (const { id, blob } of images) {
      await target.collection.blobSync.set(id, blob);
    }
    let selectedId = "";
    for (const meta of imported.collection.meta.docMetas) {
      const source = imported.collection.getDoc(meta.id)!;
      const doc = target.collection.createDoc();
      created.push(doc.id);
      doc.load();
      DocCollection.Y.applyUpdate(doc.spaceDoc, DocCollection.Y.encodeStateAsUpdate(source.spaceDoc));
      if (!doc.root) throw new Error("Не удалось восстановить импортируемый холст");
      target.collection.setDocMeta(doc.id, { title: canvasName(doc) });
      doc.resetHistory();
      if (source.id === imported.doc.id) selectedId = doc.id;
    }
    await waitForSave(target);
    target.selectCanvas(selectedId || created[0]);
    return created;
  } catch (error) {
    target.selectCanvas(originalId);
    for (const id of created) target.collection.removeDoc(id);
    throw error;
  }
}
