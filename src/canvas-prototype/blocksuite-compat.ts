import type { EdgelessEditor } from "@blocksuite/presets";

// Адаптер DOM BlockSuite 0.19.5: эти селекторы нужно проверить при обновлении библиотеки
export function mountTextToolbarAppearance(editor: EdgelessEditor) {
  const roots = new WeakSet<ShadowRoot>();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) visit(node);
      }
    }
  });

  function visit(element: Element) {
    const root = element.shadowRoot;
    if (root && !roots.has(root)) {
      roots.add(root);
      if (element.localName === "edgeless-change-text-menu") {
        const style = document.createElement("style");
        style.textContent = "editor-menu-button:has(> edgeless-font-weight-and-style-panel) { display: none !important; }";
        root.append(style);
      }
      observer.observe(root, { childList: true, subtree: true });
      for (const child of root.children) visit(child);
    }
    for (const child of element.children) visit(child);
  }

  observer.observe(editor, { childList: true, subtree: true });
  visit(editor);
  return () => observer.disconnect();
}
