import { DocCollection, Schema, type Doc } from "@blocksuite/store";
import { AffineSchemas, type ImageBlockModel } from "@blocksuite/blocks";
import { IndexedDBBlobSource, IndexedDBDocSource, MemoryBlobSource, NoopDocSource } from "@blocksuite/sync";
import { optimizeImage, omittedImagePlaceholder } from "./images";
import { readCanvasPreferences, saveCanvasPreferences } from "./preferences";

import { decode, readBackup } from "./backup";
export { exportBackup } from "./backup";

const activeCollectionKey = "tablo.canvasPrototype.activeCollection.v1";
export type CanvasSession = {
  collection: DocCollection;
  doc: Doc;
  selectCanvas(id: string): void;
  activate(): void;
  close(): void;
  waitForAssets(): Promise<void>;
};

async function createSession(
  onStatus: (saving: boolean, error?: unknown) => void,
  file?: File,
  temporary = false,
): Promise<CanvasSession> {
  // Проверяем импорт до создания нового хранилища и переключения активного холста
  const backup = file ? await readBackup(file) : undefined;
  const collectionId = backup
    ? crypto.randomUUID()
    : localStorage.getItem(activeCollectionKey) ?? crypto.randomUUID();
  const source = temporary ? new NoopDocSource() : new IndexedDBDocSource(`tablo-canvas-docs-${collectionId}`);
  const blobs = temporary ? new MemoryBlobSource() : new IndexedDBBlobSource(`tablo-canvas-assets-${collectionId}`);
  let pendingWrites = 0;
  let writeError: unknown;

  async function trackWrite<T>(write: () => Promise<T>): Promise<T> {
    pendingWrites++;
    onStatus(true);
    try {
      const result = await write();
      return result;
    } catch (error) {
      writeError = error;
      throw error;
    } finally {
      pendingWrites--;
      onStatus(pendingWrites > 0, writeError);
    }
  }
  const push = source.push.bind(source);
  source.push = (id, update) => trackWrite(async () => push(id, update));
  const setBlob = blobs.set.bind(blobs);
  blobs.set = (id, value) => trackWrite(() => setBlob(id, value));

  const collection = new DocCollection({
    id: collectionId,
    schema: new Schema().register(AffineSchemas),
    docSources: { main: source },
    blobSources: { main: blobs },
  });

  function close() {
    collection.forceStop();
    collection.dispose();
    if (source instanceof IndexedDBDocSource) {
      source.channel.close();
      void source.dbPromise?.then(db => db.close()).catch(() => {});
    }
    collection.doc.destroy();
  }

  try {
    if (backup) DocCollection.Y.applyUpdate(collection.doc, decode(backup.root));
    collection.start();
    await collection.docSync.waitForLoadedRootDoc(AbortSignal.timeout(15000));
    collection.meta.initialize();

    const existingIds = collection.meta.docMetas.map(meta => meta.id);
    if (backup && (existingIds.length !== backup.documents.length || backup.documents.some(saved => !existingIds.includes(saved.id)))) {
      throw new Error("Структура импортируемых холстов повреждена");
    }
    const docs = existingIds.map(id => collection.getDoc(id)!);
    if (docs.length === 0) docs.push(collection.createDoc());
    docs.forEach(doc => doc.load());
    if (backup) {
      for (const saved of backup.documents) DocCollection.Y.applyUpdate(collection.getDoc(saved.id)!.spaceDoc, decode(saved.update));
      for (const asset of backup.assets) {
        const bytes = decode(asset.data);
        await blobs.set(asset.id, new Blob([bytes.buffer as ArrayBuffer], { type: asset.mimeType }));
      }
      if (backup.imagesIncluded === false) {
        const images = docs.flatMap(doc => doc.getBlockByFlavour("affine:image") as ImageBlockModel[]);
        if (images.length > 0) {
          const placeholder = omittedImagePlaceholder();
          const sourceId = await collection.blobSync.set(placeholder);
          for (const image of images) image.doc.updateBlock(image, { sourceId, size: placeholder.size });
        }
      }
    }
    await collection.docSync.waitForSynced(AbortSignal.timeout(15000));
    if (existingIds.some(id => !collection.getDoc(id)!.root)) throw new Error("Не удалось восстановить холст. Исходные данные сохранены");
    if (backup && backup.imagesIncluded !== false) {
      const sourceIds = new Set(docs.flatMap(doc => Object.values(doc.blocks.peek())).flatMap(({ model }) =>
        "sourceId" in model && typeof model.sourceId === "string" && model.sourceId ? [model.sourceId] : [],
      ));
      for (const id of sourceIds) {
        if (!await collection.blobSync.get(id)) throw new Error("В файле отсутствует изображение холста");
      }
    }
    const activeDocKey = `tablo.canvasPrototype.activeDoc.v1:${collectionId}`;
    const savedActiveId = backup?.activeDocId ?? localStorage.getItem(activeDocKey);
    let doc = docs.find(doc => doc.id === savedActiveId) ?? docs[0];
    // Переносим настройки старого одиночного документа в общий набор
    saveCanvasPreferences(doc, readCanvasPreferences(doc));
    // Обрабатываем новые Blob до вычисления хеша; импорт по существующему ключу не перекодируем
    const pendingAssets = new Set<Promise<string>>();
    const setAsset = collection.blobSync.set.bind(collection.blobSync);
    collection.blobSync.set = (valueOrKey: string | Blob, value?: Blob): Promise<string> => {
      const operation = trackWrite(async () => {
        if (typeof valueOrKey === "string") return setAsset(valueOrKey, value!);
        const optimized = readCanvasPreferences(doc).optimizeImages ? await optimizeImage(valueOrKey) : valueOrKey;
        return setAsset(optimized);
      });
      pendingAssets.add(operation);
      void operation.finally(() => pendingAssets.delete(operation)).catch(() => {});
      return operation;
    };
    return {
      collection,
      get doc() { return doc; },
      selectCanvas: (id) => {
        const next = collection.getDoc(id);
        if (!next?.root) throw new Error("Не удалось открыть холст");
        doc = next;
      },
      activate: () => {
        if (temporary) throw new Error("Временный импорт нельзя сделать активным хранилищем");
        localStorage.setItem(activeDocKey, doc.id);
        localStorage.setItem(activeCollectionKey, collectionId);
      },
      close,
      waitForAssets: async () => {
        while (pendingAssets.size > 0) await Promise.all(pendingAssets);
      },
    };
  } catch (error) {
    close();
    throw error;
  }
}

export async function waitForSave(session: CanvasSession) {
  await session.waitForAssets();
  await session.collection.docSync.waitForSynced(AbortSignal.timeout(15000));
}


export function openSession(onStatus: (saving: boolean, error?: unknown) => void, file?: File) {
  return createSession(onStatus, file);
}

export function openImportSession(file: File) {
  return createSession(() => {}, file, true);
}
