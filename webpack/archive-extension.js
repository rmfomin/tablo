const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");

const distPath = path.resolve(__dirname, "../dist");
const archivePath = path.resolve(__dirname, "../builds/tablo-chrome-extension.zip");

async function createExtensionArchive() {
  if (!(await fs.pathExists(path.join(distPath, "manifest.json")))) {
    throw new Error("Extension build not found. Run npm run build:normal first.");
  }

  await fs.ensureDir(path.dirname(archivePath));

  const output = fs.createWriteStream(archivePath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const finished = new Promise((resolve, reject) => {
    output.once("close", resolve);
    output.once("error", reject);
    archive.once("error", reject);
  });

  archive.pipe(output);
  archive.glob("**/*", { cwd: distPath, ignore: ["**/.DS_Store"] }, { prefix: "" });
  await archive.finalize();
  await finished;

  console.log(`Created ${archivePath} (${archive.pointer()} bytes)`);
}

createExtensionArchive().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
