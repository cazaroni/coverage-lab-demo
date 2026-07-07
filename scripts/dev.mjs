import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

const child = spawn(
  isWindows ? "cmd.exe" : "bash",
  isWindows ? ["/c", "dev.bat"] : [resolve(rootDir, "dev.sh")],
  {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  console.error(`Failed to launch local dev stack: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
