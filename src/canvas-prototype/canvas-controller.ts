import { createCanvas, appendCanvases } from "./canvases";
import { openImportSession, waitForSave, type CanvasSession } from "./storage";

export function createCanvasController(session: CanvasSession, mount: () => Promise<void>) {
  async function restore(previousId: string, error: unknown): Promise<never> {
    session.selectCanvas(previousId);
    try { await mount(); }
    catch (restoreError) {
      throw new AggregateError([error, restoreError], "Не удалось открыть холст и восстановить редактор. Данные сохранены");
    }
    throw error;
  }

  async function switchCanvas(id: string) {
    await waitForSave(session);
    const previousId = session.doc.id;
    session.selectCanvas(id);
    try {
      await mount();
      await waitForSave(session);
      session.activate();
    } catch (error) { await restore(previousId, error); }
  }

  return {
    switchCanvas,
    async addCanvas() {
      await waitForSave(session);
      const doc = createCanvas(session);
      try { await switchCanvas(doc.id); }
      catch (error) { session.collection.removeDoc(doc.id); throw error; }
    },
    async importCanvases(file: File) {
      await waitForSave(session);
      const imported = await openImportSession(file);
      const previousId = session.doc.id;
      let created: string[] = [];
      let mounting = false;
      try {
        created = await appendCanvases(session, imported);
        mounting = true;
        await mount();
        await waitForSave(session);
        session.activate();
      } catch (error) {
        session.selectCanvas(previousId);
        for (const id of created) session.collection.removeDoc(id);
        if (mounting) await restore(previousId, error);
        throw error;
      } finally { imported.close(); }
    },
  };
}
