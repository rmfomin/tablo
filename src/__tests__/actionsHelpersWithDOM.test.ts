import {
  clickFolderItem,
  createFolderWithStat,
  showMessageWithUndo,
  type DashboardFolderCommands,
  type UiFeedbackCommands,
} from "@/newtab/04-features/bookmarks/model/actionsHelpersWithDOM";

function createUiCommands(): jest.Mocked<UiFeedbackCommands> {
  return {
    showNotification: jest.fn(),
    hideNotification: jest.fn(),
    setItemInEdit: jest.fn(),
    setPage: jest.fn(),
  };
}

test("createFolderWithStat creates an id and sends a Zustand-shaped command", () => {
  const commands: jest.Mocked<Pick<DashboardFolderCommands, "createFolder">> = {
    createFolder: jest.fn(),
  };

  const id = createFolderWithStat(commands, {
    title: "Inbox",
    spaceId: 3,
    historyStepId: 42,
  });

  expect(commands.createFolder).toHaveBeenCalledWith({
    id,
    title: "Inbox",
    spaceId: 3,
  });
});

test("undo notification calls dashboard and UI commands without legacy dispatch", () => {
  const ui = createUiCommands();
  const dashboard: jest.Mocked<Pick<DashboardFolderCommands, "undo">> = {
    undo: jest.fn(),
  };

  showMessageWithUndo("Folder removed", { ...ui, ...dashboard });

  const notification = ui.showNotification.mock.calls[0][0];
  notification.button?.onClick?.();

  expect(dashboard.undo).toHaveBeenCalledTimes(1);
  expect(ui.hideNotification).toHaveBeenCalledTimes(1);
});

test("custom import bookmark changes only the UI page", () => {
  const commands = createUiCommands();

  clickFolderItem(
    10,
    {
      tabs: [],
      spaces: [{
        id: 1,
        objectType: "space",
        position: "a0",
        title: "Default",
        folders: [{
          id: 2,
          objectType: "folder",
          position: "a0",
          title: "Actions",
          items: [{
            id: 10,
            type: "bookmark",
            objectType: "bookmark",
            title: "Import",
            url: "tablo://import-bookmarks",
            favIconUrl: "",
            position: "a0",
          }],
        }],
      }],
    },
    commands,
    false,
    false,
  );

  expect(commands.setPage).toHaveBeenCalledWith("import");
});
