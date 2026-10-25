export function renderStartupError(error: unknown): void {
  console.error("Failed to load Tablo storage", error);
  const root = document.getElementById("root");
  if (root) root.textContent = "Не удалось загрузить данные Tablo. Обновите вкладку и повторите попытку";
  document.body.classList.add("app-loaded");
}
