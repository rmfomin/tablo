import React from "react";
import { NewFolderPlaceholder } from "@/newtab/03-widgets/dashboard/Folder/NewFolderPlaceholder";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";

test("new folder placeholder создаёт папку по клику и сохраняет drag-and-drop contract", () => {
  const onCreate = vi.fn();
  const element = NewFolderPlaceholder({ onCreate });
  const [header, items] = React.Children.toArray(element.props.children) as React.ReactElement[];

  expect(element.props["data-role"]).toBe(DOM_ROLE.folder);
  expect(element.props["data-folder-id"]).toBe("-1");
  expect(element.props["data-folder-new"]).toBe("true");
  expect(header.type).toBe("button");
  expect(header.props.type).toBe("button");
  expect(header.props.title).toBe("Add folder");
  expect(header.props["aria-label"]).toBe("Add folder");
  expect(items.props["data-role"]).toBe(DOM_ROLE.folderItems);
  expect(items.props["data-folder-id"]).toBe("-1");

  header.props.onClick();

  expect(onCreate).toHaveBeenCalledTimes(1);
});
