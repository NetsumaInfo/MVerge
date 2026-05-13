import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, "..", "..");
const serverCrateDir = resolve(projectRoot, "rust-server");
const manifestPath = resolve(serverCrateDir, "Cargo.toml");

const build = spawnSync(
  "cargo",
  ["build", "--release", "--bin", "amverge_cep_server", "--manifest-path", manifestPath],
  {
    cwd: projectRoot,
    stdio: "inherit",
  }
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const exeName = process.platform === "win32" ? "amverge_cep_server.exe" : "amverge_cep_server";
const sourcePath = resolve(serverCrateDir, "target", "release", exeName);
const destDir = resolve(projectRoot, "bin");
const destPath = resolve(destDir, exeName);

if (!existsSync(sourcePath)) {
  console.error(`[amverge] build OK mais binaire introuvable: ${sourcePath}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
try {
  copyFileSync(sourcePath, destPath);
} catch (err) {
  if (err && typeof err === "object" && "code" in err && err.code === "EBUSY") {
    console.warn(`[amverge] destination busy, keep current binary: ${destPath}`);
  } else {
    throw err;
  }
}

console.log(`[amverge] CEP server copie: ${destPath}`);
