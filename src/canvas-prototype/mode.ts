import { DocModeExtension, DocModeService } from "@blocksuite/blocks";

class CanvasDocModeService extends DocModeService {
  override getEditorMode() {
    return "edgeless" as const;
  }
}

export function createCanvasModeExtension(docId: string) {
  const service = new CanvasDocModeService();
  service.setPrimaryMode("edgeless", docId);
  return DocModeExtension(service);
}
