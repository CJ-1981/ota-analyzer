import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8765;
const OUT_DIR = path.join(__dirname, "..", "out");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".txt": "text/plain",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, `http://localhost:${PORT}`).pathname;
  let filePath;

  // Handle /ota-analyzer prefix
  if (urlPath.startsWith("/ota-analyzer")) {
    filePath = path.join(OUT_DIR, urlPath.slice("/ota-analyzer".length) || "/index.html");
  } else {
    filePath = path.join(OUT_DIR, urlPath);
  }

  if (filePath.endsWith("/") || filePath === path.join(OUT_DIR)) {
    filePath = path.join(filePath, "index.html");
  }

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`404: ${urlPath} -> ${filePath}`);
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    // Rewrite basePath in HTML to work from /
    if (ext === ".html") {
      const html = data.toString().replace(/\/ota-analyzer\//g, "/");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } else {
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Static server running at http://localhost:${PORT}`);
});
