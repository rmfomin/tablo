import React from "react";
import { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { DropdownSubMenu } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { DropdownMenuIcon } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenuIcon";
import IconNewSpace from "@/newtab/03-widgets/spaces-list/SpacesList/icons/new-space.svg";

export function getFoldersList(
  space: Pick<SpaceV3, "id" | "folders">,
  onFolderClick: (folderId: number, spaceId: number) => void,
  onCreateFolderClick: (spaceId: number) => void,
  currentFolderId?: number,
) {
  return (
    <>
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
      {space.folders.length > 0 ? (
        <div className="dropdown-menu__separator" />
      ) : null}
      <button
        className="dropdown-menu__button focusable"
        onClick={() => onCreateFolderClick(space.id)}
      >
        <DropdownMenuIcon name="newFolder" />
        Create new folder
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
      {spaces.map((space) => (
        <button
          key={space.id}
          className="dropdown-menu__button sub-menu__button--no-icon focusable"
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
  onCreateSpaceClick?: () => void,
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
          {spaces.map((space) => (
            <DropdownSubMenu
              key={space.id}
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
      {onCreateSpaceClick && spaces.length !== 1 ? (
        <>
          {spaces.length > 0 ? (
            <div className="dropdown-menu__separator" />
          ) : null}
          <button
            className="dropdown-menu__button dropdown-menu__button--with-icon focusable"
            onClick={onCreateSpaceClick}
          >
            <IconNewSpace
              className="dropdown-menu__icon"
              aria-hidden="true"
              focusable="false"
            />
            Create new space
          </button>
        </>
      ) : null}
    </>
  );
}
