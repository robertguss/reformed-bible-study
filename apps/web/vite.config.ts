import { createReadStream, statSync } from "node:fs"
import type { IncomingMessage, ServerResponse } from "node:http"
import { join, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { foldkit } from "@foldkit/vite-plugin"
import { defineConfig, type Plugin } from "vite"

const RELEASE_DATA = fileURLToPath(new URL("../../dist/release/data", import.meta.url))

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

const serveReleaseData = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
): void => {
  if (request.method !== "GET" && request.method !== "HEAD") return next()
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname)
  const file = resolve(join(RELEASE_DATA, path))
  if (!file.startsWith(RELEASE_DATA + sep) || !isFile(file)) {
    response.statusCode = 404
    response.end("Not found")
    return
  }
  response.setHeader("Content-Type", "application/json; charset=utf-8")
  createReadStream(file).pipe(response)
}

const releaseData = (): Plugin => ({
  name: "reformed-bible:release-data",
  configureServer: (server) => {
    server.middlewares.use("/data", serveReleaseData)
  },
  configurePreviewServer: (server) => {
    server.middlewares.use("/data", serveReleaseData)
  },
})

export default defineConfig({
  plugins: [foldkit(), releaseData()],
  build: { target: "es2022" },
})
