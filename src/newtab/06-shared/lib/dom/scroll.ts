export function scrollElementIntoView(selector: string) {
  requestAnimationFrame(() => {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.document.body.clientHeight;
      if (rect.bottom > viewportHeight) {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  });
}
