import {
  DataBackupV3,
  SpaceBackupV3,
  SpaceV3,
} from "@/newtab/05-entities/dashboard/model/types";
import { normalizeBackupV3 } from "@/newtab/04-features/bookmarks-import/model/adapters";

export function createExportBackupV3(spaces: SpaceV3[]): DataBackupV3 {
  return normalizeBackupV3({ isTablo: true, version: 3, spaces });
}

export function createExportSpaceBackupV3(space: SpaceV3): SpaceBackupV3 {
  return {
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: normalizeBackupV3({ isTablo: true, version: 3, spaces: [space] }).spaces[0],
  };
}

function downloadObjectAsJson(exportObj: unknown, exportName: string) {
  const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportObj))}`;
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `${exportName}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function onExportJson(spaces: SpaceV3[]) {
  const currentDate = new Date().toISOString().slice(0, 10);
  downloadObjectAsJson(createExportBackupV3(spaces), `backup_tablo_${currentDate}`);
}

export function onExportSpaceJson(space: SpaceV3) {
  const safeTitle = space.title.trim().replace(/[^a-z0-9_-]+/gi, "_") || "space";
  downloadObjectAsJson(createExportSpaceBackupV3(space), `tablo_space_${safeTitle}`);
}
