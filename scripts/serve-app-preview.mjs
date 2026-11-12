import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve(process.argv[2] ?? "artifacts/browser-app"),
  port = Number(process.env.CLEANPROOF_PREVIEW_PORT ?? 8081);
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let name = decodeURIComponent(url.pathname);
      if (name === "/" || !extname(name)) name = "/index.html";
      const path = resolve(root, "." + name);
      if (!path.startsWith(root + "/")) throw Error();
      const bytes = await readFile(path);
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".wasm": "application/wasm",
            ".png": "image/png",
            ".json": "application/json",
            ".ttf": "font/ttf",
            ".svg": "image/svg+xml",
          }[extname(path)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      "Exact-project browser preview: http://127.0.0.1:" +
        port +
        " (synthetic data; native acceptance pending)",
    ),
  );
