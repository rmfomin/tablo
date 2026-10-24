import "./demo.scss";
import { installDemoChrome } from "./mockChrome";

installDemoChrome();
document.body.classList.add("demo-mode");
void import("@/newtab/01-app/index");
