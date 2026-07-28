import React from "react";
import { Modal } from "@/newtab/components/common/Modal/Modal";
import styles from "./ImportConfirmationModal.module.scss";

export const ImportConfirmationModal = (p: {
  onClose: (opt: string) => void;
}) => {
  return (
    <Modal className={styles.modal} onClose={() => p.onClose("add")}>
      <h2>
        Importing JSON backup will replace <br />
        all current bookmarks
      </h2>
      <button
        className="btn__setting"
        style={{ float: "right" }}
        onClick={() => p.onClose("cancel")}
      >
        Cancel
      </button>
      <button
        className="btn__setting primary"
        style={{ float: "right" }}
        onClick={() => p.onClose("import")}
        autoFocus={true}
      >
        Import
      </button>
    </Modal>
  );
};
