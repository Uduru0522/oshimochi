const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT) || 4173;
const basePathArgument = process.argv.find((argument) => argument.startsWith("--base-path="));

function normalizeBasePath(value = "/") {
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;

  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const basePath = normalizeBasePath(basePathArgument?.slice("--base-path=".length));

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function resolveRequestPath(url) {
  const requestPath = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const isWithinBasePath = basePath === "/" || requestPath.startsWith(basePath);

  if (!isWithinBasePath) {
    return null;
  }

  const scopedRequestPath = basePath === "/" ? requestPath : requestPath.slice(basePath.length);
  const normalizedPath = scopedRequestPath === ""
    ? ""
    : path.normalize(scopedRequestPath).replace(/^[/\\]+/, "");
  const safePath = normalizedPath.replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath === "" ? "index.html" : safePath);

  if (!filePath.startsWith(root)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(request.url);

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
});

server.listen(port, () => {
  const baseUrl = `http://localhost:${port}${basePath}`;

  console.log("Oshimochi is running.");
  console.log(`User mode:  ${baseUrl}`);
  console.log(`Debug mode: ${baseUrl}?debug=1`);
});
