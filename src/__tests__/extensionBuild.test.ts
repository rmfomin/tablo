import { execFileSync } from "node:child_process";
import path from "node:path";

test("built extension has local startup assets and its module worker handles startup messages", () => {
  const output = execFileSync(process.execPath, [
    "--experimental-vm-modules", "--disable-warning=ExperimentalWarning",
    path.resolve(__dirname, "../test-utils/checkBuiltExtension.mjs"),
  ], { encoding: "utf8" });
  expect(output).toContain("Built extension smoke check passed");
});
