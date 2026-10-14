import { request } from "node:http";

const maxBytes = 32 * 1024 * 1024;

export function readHostLibrary(socketPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Allow the helper's 60-second command timeout to report its own error first.
    const timer = setTimeout(() => req.destroy(new Error("The host Lutris export timed out. The existing library was kept.")), 65_000);
    // A fresh connection avoids retaining a pooled socket after a helper restart.
    const req = request({ socketPath, path: "/refresh", method: "POST", agent: false }, (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) {
          req.destroy(new Error("The host Lutris export is too large. The existing library was kept."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (response.statusCode !== 200) {
          let message = "Host Lutris refresh failed. The existing library was kept.";
          try {
            const error = JSON.parse(body).error;
            if (typeof error === "string") message = error;
          } catch { /* Keep the actionable default for a malformed response. */ }
          reject(new Error(message));
        } else {
          resolve(body);
        }
      });
    });
    req.on("close", () => clearTimeout(timer));
    req.on("error", (error: NodeJS.ErrnoException) => {
      if (["ENOENT", "ECONNREFUSED", "EACCES", "EPIPE", "ECONNRESET"].includes(error.code ?? "")) {
        reject(new Error("The host Lutris helper is unavailable. On the host, run: systemctl --user restart lutris-library-bridge.service. The existing library was kept."));
      } else {
        reject(error);
      }
    });
    req.end();
  });
}
