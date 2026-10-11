import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MT5_BASE_URL = "http://127.0.0.1:8000/api/v1";

function barsApi(): Plugin {
  return {
    name: "bars-api",
    async configureServer(server) {
      const env = loadEnv(server.config.mode, repoRoot, "");
      if (!process.env.MT5_BASE_URL?.trim()) {
        process.env.MT5_BASE_URL =
          env.MT5_BASE_URL?.trim() || DEFAULT_MT5_BASE_URL;
      }

      const mod = (await server.ssrLoadModule(
        path.join(repoRoot, "src/page/barsMiddleware.ts"),
      )) as {
        handleBarsHttp: (
          req: IncomingMessage,
          res: ServerResponse,
        ) => Promise<boolean>;
      };
      const catalogMod = (await server.ssrLoadModule(
        path.join(repoRoot, "src/page/catalogMiddleware.ts"),
      )) as {
        handleCatalogHttp: (
          req: IncomingMessage,
          res: ServerResponse,
        ) => Promise<boolean>;
      };

      server.middlewares.use(async (req, res, next) => {
        try {
          if (await mod.handleBarsHttp(req, res)) {
            return;
          }
          if (await catalogMod.handleCatalogHttp(req, res)) {
            return;
          }
          next();
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  root: path.join(repoRoot, "web"),
  plugins: [barsApi()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    fs: { allow: [repoRoot] },
  },
});
