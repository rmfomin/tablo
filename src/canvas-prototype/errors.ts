export function showError(error: unknown) {
  console.error("Canvas prototype:", error);
  const status = document.querySelector<HTMLElement>("#status")!;
  const errorMessage = document.querySelector<HTMLElement>("#error")!;
  status.textContent = "Не удалось завершить действие";
  status.dataset.error = "true";
  errorMessage.textContent = error instanceof Error ? error.message : "Ошибка редактора. Экспортируйте холст и повторите попытку.";
  errorMessage.hidden = false;
}
