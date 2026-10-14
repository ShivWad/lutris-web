import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultSocketPath } from "./host-bridge.mjs";

if (process.platform !== "linux") throw new Error("The host helper installer requires Linux with a systemd user session.");

const script = fileURLToPath(new URL("./host-bridge.mjs", import.meta.url));
const directory = path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config"), "systemd", "user");
const unit = "lutris-library-bridge.service";
const servicePath = [path.dirname(process.execPath), path.join(homedir(), ".local/bin"), "/usr/local/bin", "/usr/bin", "/bin"].join(":");
const quote = (value) => {
  if (/[\r\n\0]/.test(value)) throw new Error("Unsupported newline in a service path or environment.");
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("%", "%%")}"`;
};

execFileSync("systemctl", ["--user", "show-environment"], { stdio: "ignore" });
mkdirSync(path.dirname(defaultSocketPath), { recursive: true, mode: 0o750 });
chmodSync(path.dirname(defaultSocketPath), 0o750);
mkdirSync(directory, { recursive: true });
writeFileSync(path.join(directory, unit), `[Unit]
Description=Lutris library export helper

[Service]
Type=simple
ExecStart=${quote(process.execPath)} ${quote(script)}
Environment=${quote(`PATH=${servicePath}`)}
UMask=0007
Restart=on-failure
RestartSec=3
TimeoutStopSec=10

[Install]
WantedBy=default.target
`);
execFileSync("systemctl", ["--user", "daemon-reload"], { stdio: "inherit" });
execFileSync("systemctl", ["--user", "enable", "--now", unit], { stdio: "inherit" });
execFileSync("systemctl", ["--user", "restart", unit], { stdio: "inherit" });
console.log(`Host helper installed. Socket access group: ${process.getgid()}.
Start Docker with: docker compose -f compose.yaml -f compose.host.yaml up --build -d
If your host group is not 1000, set LUTRIS_HOST_GID=${process.getgid()} in .env first.`);
