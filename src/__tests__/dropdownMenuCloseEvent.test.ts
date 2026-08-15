const fs = require("fs");
const path = require("path");

export {};

test("dropdown menu closes on outside click instead of mousedown", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/06-shared/ui/DropdownMenu/DropdownMenu.tsx"
    ),
    "utf8"
  );

  expect(source).toContain("window.setTimeout");
  expect(source).toContain(
    'document.addEventListener("click", onOutsideClick)'
  );
  expect(source).toContain(
    'document.removeEventListener("click", onOutsideClick)'
  );
  expect(source).not.toContain('document.addEventListener("mousedown"');
});

test("opening a dropdown menu broadcasts a close signal to other dropdown menus", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/06-shared/ui/DropdownMenu/DropdownMenu.tsx"
    ),
    "utf8"
  );

  expect(source).toContain("DROPDOWN_MENU_OPENED_EVENT");
  expect(source).toContain("document.dispatchEvent");
  expect(source).toContain("document.addEventListener(DROPDOWN_MENU_OPENED_EVENT");
  expect(source).toContain("document.removeEventListener");
  expect(source).toContain("onOtherMenuOpened");
});
