import React from "react";
import { SpaceV3 } from "@/newtab/helpers/types";
import { DropdownSubMenu } from "@/newtab/components/common/DropdownMenu/DropdownMenu";

export function getFoldersList(
  space: Pick<SpaceV3, "id" | "folders">,
  onFolderClick: (folderId: number, spaceId: number) => void,
  onCreateFolderClick: (spaceId: number) => void,
  currentFolderId?: number,
) {
  return (
    <>
      <div className="sub-menu__title">Folders:</div>
      {space.folders.map((folder) => (
        <button
          key={folder.id}
          className="dropdown-menu__button focusable"
          disabled={currentFolderId === folder.id}
          onClick={() => onFolderClick(folder.id, space.id)}
        >
          <span
            className="folder-color"
            style={{ backgroundColor: folder.color }}
          ></span>
          <span
            style={{
              flexGrow: 1,
              fontWeight: currentFolderId === folder.id ? 700 : undefined,
            }}
          >
            {folder.title}
          </span>
        </button>
      ))}
      <button
        className="btn__setting"
        style={{ marginTop: "12px" }}
        onClick={() => onCreateFolderClick(space.id)}
      >
        + new folder
      </button>
    </>
  );
}

export function getSpacesList(
  spaces: Pick<SpaceV3, "id" | "title">[],
  onSpaceClick: (spaceId: number) => void,
  currentSpaceId?: number,
) {
  return (
    <>
      <div className="sub-menu__title">Spaces:</div>
      {spaces.map((space) => (
        <button
          key={space.id}
          style={{ marginLeft: "8px" }}
          className="dropdown-menu__button focusable"
          disabled={currentSpaceId === space.id}
          onClick={() => onSpaceClick(space.id)}
        >
          <span
            style={{
              fontWeight: currentSpaceId === space.id ? 700 : undefined,
            }}
          >
            {space.title}
          </span>
        </button>
      ))}
    </>
  );
}

export function getSpacesWithNestedFoldersList(
  spaces: Pick<SpaceV3, "id" | "title" | "folders">[],
  onFolderClick: (folderId: number) => void,
  onCreateFolderClick: (spaceId: number) => void,
  currentFolderId?: number,
) {
  return (
    <>
      {spaces.length === 1 ? (
        getFoldersList(
          spaces[0],
          onFolderClick,
          onCreateFolderClick,
          currentFolderId,
        )
      ) : (
        <>
          <div className="sub-menu__title">Spaces:</div>
          {spaces.map((space) => (
            <DropdownSubMenu
              key={space.id}
              style={{ marginLeft: "8px" }}
              menuId={space.id}
              title={space.title}
              submenuContent={getFoldersList(
                space,
                onFolderClick,
                onCreateFolderClick,
                currentFolderId,
              )}
            ></DropdownSubMenu>
          ))}
        </>
      )}
    </>
  );
}
