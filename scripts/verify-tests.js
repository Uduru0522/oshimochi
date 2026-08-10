const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const testRoot = path.join(projectRoot, "test");
const TEST_FILE_PATTERN = /\.test\.js$/;
const DISABLED_TEST_PATTERN = /\b(?:describe|it|test)\.(?:only|skip|todo)\s*\(/;
const DISABLED_TEST_OPTION_PATTERN = /\b(?:describe|it|test)\s*\(\s*(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)\s*,\s*\{[^}]*\b(?:only|skip|todo)\s*:\s*true\b/s;
const TEST_NAME_PATTERN = /\btest\s*\(\s*["'`]([^"'`]+)["'`]/g;

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

function toProjectPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

function verifyTestFiles() {
  const files = collectFiles(testRoot);
  const unexpectedJavaScript = files.filter(
    (filePath) => path.extname(filePath) === ".js" && !TEST_FILE_PATTERN.test(filePath)
  );

  if (unexpectedJavaScript.length > 0) {
    throw new Error(
      `JavaScript helpers inside test/ are executed as tests by Node. Move them to test-support/: ${
        unexpectedJavaScript.map(toProjectPath).join(", ")
      }`
    );
  }

  const names = new Map();

  files.filter((filePath) => TEST_FILE_PATTERN.test(filePath)).forEach((filePath) => {
    const source = fs.readFileSync(filePath, "utf8");

    if (
      DISABLED_TEST_PATTERN.test(source) ||
      DISABLED_TEST_OPTION_PATTERN.test(source)
    ) {
      throw new Error(`${toProjectPath(filePath)} contains a focused or disabled test.`);
    }

    const testNames = [...source.matchAll(TEST_NAME_PATTERN)].map((match) => match[1]);

    if (testNames.length === 0) {
      throw new Error(`${toProjectPath(filePath)} contains no statically named tests.`);
    }

    testNames.forEach((name) => {
      const existingPath = names.get(name);

      if (existingPath) {
        throw new Error(
          `Duplicate test name "${name}" in ${existingPath} and ${toProjectPath(filePath)}.`
        );
      }

      names.set(name, toProjectPath(filePath));
    });
  });
}

try {
  verifyTestFiles();
  console.log("Test suite verification passed.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
