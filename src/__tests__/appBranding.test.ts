const fs = require("fs");
const path = require("path");

export {};

describe("app branding", () => {
  test.each(["manifest-normal.json", "manifest-overrideless.json"])(
    "%s uses Tablo as the extension name",
    (manifestFile) => {
      const manifestPath = path.join(__dirname, "../../public", manifestFile);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

      expect(manifest.short_name).toBe("Tablo");
      expect(manifest.name).toBe("Tablo");
      expect(manifest.description).toBe("Tablo");
      expect(manifest.action.default_title).toBe("Tablo");
    }
  );

  test("newtab html title uses Tablo", () => {
    const htmlPath = path.join(__dirname, "../../public/newtab.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html).toContain("<title>Tablo</title>");
  });
});
