import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../dist/", import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
assert.equal(manifest.background.type, "module", "The built ESM worker requires a module manifest");
assert.ok(manifest.content_security_policy.extension_pages.includes("'wasm-unsafe-eval'"));
assert.ok(!manifest.content_security_policy.extension_pages.includes("'unsafe-eval'"));
for (const html of ["newtab.html", "canvas-prototype.html"]) {
  const source = fs.readFileSync(path.join(root, html), "utf8");
  for (const match of source.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
    assert.ok(!/^(https?:)?\/\//.test(match[1]), "Extension startup assets must be local");
    assert.ok(fs.existsSync(path.resolve(root, match[1].replace(/^\//, ""))), `Missing ${html} asset: ${match[1]}`);
  }
}

const events = {};
const event = (name) => ({ addListener: (listener) => { events[name] = listener; } });
const messages = [];
const tabs = [];
const chrome = {
  action: { onClicked: event("action") },
  runtime: { getURL: file => `chrome-extension://test/${file}`, onMessage: event("message") },
  tabs: {
    onActivated: event("activated"),
    get: (id, callback) => callback({ id }),
    create: tab => tabs.push(tab),
  },
};
const context = vm.createContext({
  chrome, console,
  BroadcastChannel: class { postMessage(message) { messages.push(message); } },
});
const modules = new Map();
function load(filename) {
  filename = path.resolve(filename);
  assert.ok(filename.startsWith(root), "Worker imports must stay inside the extension build");
  if (!modules.has(filename)) {
    modules.set(filename, new vm.SourceTextModule(fs.readFileSync(filename, "utf8"), { context, identifier: filename }));
  }
  return modules.get(filename);
}
const worker = load(path.join(root, manifest.background.service_worker));
await worker.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier)));
await worker.evaluate();
assert.equal(typeof events.action, "function");
assert.equal(typeof events.message, "function");
for (const tabId of [1, 2, 3, 4]) events.activated({ tabId });
let response;
events.message({ type: "get-last-active-tabs" }, {}, value => { response = value; });
assert.deepEqual(JSON.parse(JSON.stringify(response.tabs)), [4, 3, 2]);
assert.equal(messages[0].type, "last-active-tabs-updated");
await events.action();
assert.equal(tabs[0].url, "chrome-extension://test/newtab.html");
console.log("Built extension smoke check passed");
