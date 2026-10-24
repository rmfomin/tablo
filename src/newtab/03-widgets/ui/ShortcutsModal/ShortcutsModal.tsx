import React from "react";
import { Modal } from "@/newtab/06-shared/ui/Modal/Modal";
import { IS_MAC_DEVICE } from "@/newtab/06-shared/lib/platform";

export const ShortcutsModal = ({
  setOpen,
}: {
  setOpen: (value: boolean) => void;
}) => {
  const cmdOrCtrl = IS_MAC_DEVICE ? `⌘` : `CTRL`;

  return (
    <Modal className="modal-app modal-shortcuts" onClose={() => setOpen(false)}>
      <div className="modal-no-override">
        <h2>Keyboard shortcuts</h2>
        <table className="shortcuts-table">
          <tbody>
            <tr>
              <th scope="row"><span className="hotkey">{cmdOrCtrl}&thinsp;+&thinsp;F</span></th>
              <td>Open search</td>
            </tr>
            <tr>
              <th scope="row"><span className="hotkey">↓</span></th>
              <td>Open search when the page has focus</td>
            </tr>
            <tr>
              <th scope="row"><span className="hotkey">↑ / ↓</span></th>
              <td>Navigate search results</td>
            </tr>
            <tr>
              <th scope="row"><span className="hotkey">Esc</span></th>
              <td>Open or close search</td>
            </tr>
            <tr>
              <th scope="row"><span className="hotkey">{cmdOrCtrl}&thinsp;+&thinsp;click</span></th>
              <td>Open bookmark in a new tab</td>
            </tr>
            <tr>
              <th scope="row"><span className="hotkey">Delete / Backspace</span></th>
              <td>Delete selected items</td>
            </tr>
            <tr>
              <th scope="row"><span className="hotkey">{cmdOrCtrl}&thinsp;+&thinsp;Z</span></th>
              <td>Undo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
