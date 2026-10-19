import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  LAYER_DEPENDENCIES,
  verifyLayerBoundaries,
  verifyNoModuleCycles,
  verifyStylesheetGraph
} = require("../../scripts/verify-static.js");

const sourceRoot = path.resolve(import.meta.dirname, "../../src");

function sourcePath(...segments) {
  return path.join(sourceRoot, ...segments);
}

test("static architecture policy covers every JavaScript source layer", () => {
  assert.deepEqual(
    [...Object.keys(LAYER_DEPENDENCIES)].sort(),
    [
      "app",
      "application",
      "bootstrap",
      "data",
      "localization",
      "navigation",
      "root",
      "services",
      "shared",
      "views"
    ]
  );
});

test("static architecture policy permits documented view dependencies", () => {
  const view = sourcePath("views", "items", "items-view.js");
  const graph = new Map([[view, [
    sourcePath("application", "items", "manage-items.js"),
    sourcePath("localization", "translate.js"),
    sourcePath("shared", "dom.js"),
    sourcePath("views", "items", "item-browser.js")
  ]]]);

  assert.doesNotThrow(() => verifyLayerBoundaries(graph));
});

test("static architecture policy rejects a view importing a data adapter", () => {
  const view = sourcePath("views", "items", "items-view.js");
  const adapter = sourcePath("data", "indexeddb", "indexeddb-storage.js");

  assert.throws(
    () => verifyLayerBoundaries(new Map([[view, [adapter]]])),
    /views layer may only depend on/
  );
});

test("static architecture policy rejects unconfigured source layers", () => {
  const source = sourcePath("experimental", "feature.js");

  assert.throws(
    () => verifyLayerBoundaries(new Map([[source, []]])),
    /unconfigured source layer "experimental"/
  );
});

test("static architecture verification reports the complete dependency cycle", () => {
  const first = sourcePath("shared", "first.js");
  const second = sourcePath("shared", "second.js");
  const graph = new Map([
    [first, [second]],
    [second, [first]]
  ]);

  assert.throws(
    () => verifyNoModuleCycles(graph),
    /first\.js -> .*second\.js -> .*first\.js/
  );
});

test("static stylesheet graph includes every owned style layer", () => {
  assert.deepEqual(
    [...verifyStylesheetGraph()].sort(),
    [
      "./src/styles/administration.css",
      "./src/styles/app.css",
      "./src/styles/dashboard.css",
      "./src/styles/foundation.css",
      "./src/styles/items.css",
      "./src/styles/responsive.css"
    ]
  );
});
