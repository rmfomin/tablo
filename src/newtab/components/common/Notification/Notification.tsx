import React, { useRef } from "react";
import { CSSTransition } from "react-transition-group";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import cn from "clsx";
import IconProgress from "./icons/progress.svg";
import styles from "./Notification.module.scss";

export const Notification = React.memo(() => {
    const notification = useUiStore((state) => state.notification);
    const refEl = useRef<HTMLDivElement>(null);

    return (
      <div className={styles.box}>
        <CSSTransition
          nodeRef={refEl}
          in={notification.visible}
          timeout={300}
          classNames="notification"
          unmountOnExit
        >
          <div
            className={cn(styles.notification, {
              [styles.error]: notification.isError,
            })}
            ref={refEl}
          >
            {notification.isLoading && <IconProgress />}
            {notification.message}
            {notification.button ? (
              <span
                className={styles.button}
                onClick={notification.button.onClick}
              >
                {notification.button.text}
              </span>
            ) : null}
          </div>
        </CSSTransition>
      </div>
    );
  });
