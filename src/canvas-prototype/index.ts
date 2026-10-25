import "./style.css";
import { showError } from "./errors";
import { returnToBookmarks } from "./navigation";
import { startCanvasThemeSync } from "./theme";

startCanvasThemeSync();

document.querySelector("#back")!.addEventListener("click", () => {
  // Выход остаётся доступным даже при ошибке загрузки редактора
  if (document.querySelector("edgeless-editor")) return;
  returnToBookmarks();
});

void import("./editor").then(({ startEditor }) => startEditor()).catch(showError);
