// @vitest-environment happy-dom
import path from "node:path";
import { compile } from "sass";
import { renderStartupError } from "@/newtab/01-app/ui/startupError";

afterEach(() => {
  document.body.replaceChildren();
  document.body.classList.remove("app-loaded");
  document.head.replaceChildren();
  vi.restoreAllMocks();
});

test("failed startup shows a visible error while the application is still hidden", async () => {
  const style = document.createElement("style");
  style.textContent = compile(path.resolve(__dirname, "../styles/_base.scss")).css;
  document.head.append(style);
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  const failure = new Error("Chrome storage unavailable");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(getComputedStyle(document.body).visibility).toBe("hidden");

  await Promise.reject(failure).catch(renderStartupError);

  expect(root.textContent).toContain("Не удалось загрузить данные Tablo");
  expect(getComputedStyle(document.body).visibility).toBe("visible");
  expect(log).toHaveBeenCalledWith("Failed to load Tablo storage", failure);
});
