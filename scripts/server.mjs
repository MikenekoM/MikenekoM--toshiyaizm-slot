import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PublicOpenAIImageError,
  createOpenAIImageClient,
} from "./openai-image-client.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const maxBodyBytes = 16 * 1024;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(message);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let totalBytes = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBodyBytes) {
        reject(new PublicOpenAIImageError("リクエストが大きすぎます。", 413));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    request.on("error", () => {
      reject(new PublicOpenAIImageError("リクエストを読み取れませんでした。", 400));
    });
  });
}

async function handleGenerateImage(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "POSTで呼び出してください。" });
    return;
  }

  let requestBody;
  try {
    requestBody = JSON.parse(await readBody(request));
  } catch (error) {
    const statusCode = error instanceof PublicOpenAIImageError ? error.statusCode : 400;
    sendJson(response, statusCode, { error: "リクエスト本文を確認してください。" });
    return;
  }

  try {
    const client = createOpenAIImageClient();
    const result = await client.generateImage({
      prompt: requestBody.prompt,
      size: requestBody.size,
      quality: requestBody.quality,
    });

    sendJson(response, 200, {
      imageDataUrl: `data:${result.mimeType};base64,${result.imageBase64}`,
      model: result.model,
      size: result.size,
      quality: result.quality,
    });
  } catch (error) {
    if (error instanceof PublicOpenAIImageError) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    sendJson(response, 500, { error: "画像生成に失敗しました。" });
  }
}

function isBlockedStaticPath(pathname) {
  const lowerPath = pathname.toLowerCase();
  return (
    lowerPath.startsWith("/secrets/") ||
    lowerPath === "/.env" ||
    lowerPath === "/.env.local" ||
    lowerPath.endsWith(".key") ||
    lowerPath.endsWith("/openai_api_key.txt") ||
    lowerPath.includes("/.git/")
  );
}

async function handleStaticFile(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "GETで呼び出してください。");
    return;
  }

  if (isBlockedStaticPath(url.pathname)) {
    sendText(response, 404, "Not found");
    return;
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestedPath);
  } catch {
    sendText(response, 400, "Bad request");
    return;
  }

  const safePath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const filePath = path.resolve(rootDir, safePath);
  if (!filePath.startsWith(`${rootDir}${path.sep}`)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(file);
  } catch {
    sendText(response, 404, "Not found");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (url.pathname === "/api/images/generate") {
    await handleGenerateImage(request, response);
    return;
  }

  if (url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      openaiApiKeyConfigured: Boolean(String(process.env.OPENAI_API_KEY || "").trim()),
    });
    return;
  }

  await handleStaticFile(request, response, url);
});

server.listen(port, () => {
  console.log(`ローカルサーバーを起動しました: http://localhost:${port}/`);
});
