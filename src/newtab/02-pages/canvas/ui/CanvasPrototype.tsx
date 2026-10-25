import React, { useEffect, useRef } from "react";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import styles from "./CanvasPrototype.module.scss";

export function CanvasPrototype() {
  const frame = useRef<HTMLIFrameElement>(null);
  const setPage = useUiStore((state) => state.setPage);
  const colorTheme = useUiStore((state) => state.colorTheme);
  const initialSource = useRef(`./canvas-prototype.html?theme=${colorTheme}`);

  const sendTheme = () => {
    frame.current?.contentWindow?.postMessage(
      { type: "tablo-canvas-theme", theme: colorTheme },
      window.location.origin,
    );
  };

  useEffect(sendTheme, [colorTheme]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        event.origin === window.location.origin &&
        event.data?.type === "tablo-canvas-close"
      ) {
        setPage("default");
      }
      if (
        event.source === frame.current?.contentWindow &&
        event.origin === window.location.origin &&
        event.data?.type === "tablo-canvas-ready"
      ) {
        frame.current?.contentWindow?.postMessage(
          { type: "tablo-canvas-theme", theme: colorTheme },
          window.location.origin,
        );
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setPage, colorTheme]);

  return (
    <iframe
      ref={frame}
      className={styles.frame}
      src={initialSource.current}
      onLoad={sendTheme}
      title="Холст Tablo"
      allow="clipboard-read; clipboard-write"
    />
  );
}
