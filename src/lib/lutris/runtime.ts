import type { LibraryRuntimeMode } from "./types";

export function getLibraryRuntimeMode(): LibraryRuntimeMode {
  if (process.env.LUTRIS_DEMO === "1") return "demo";
  if (process.env.LUTRIS_HOST_SOCKET) return "local";
  if (process.env.LUTRIS_IMPORT_FILE) return "import";
  return "local";
}
