export type AppEvent<T> = {
  payload: T;
};

export type Event<T> = {
  payload: T;
};

type ListenHandler<T> = (event: AppEvent<T>) => void;
type Unlisten = () => void;

type CepDialogArgs = {
  multiple?: boolean;
  directory?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
  defaultPath?: string;
  title?: string;
};

type CepSaveDialogArgs = {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  title?: string;
};

type ActiveProcessState = {
  detectPid: number | null;
  detectChild: any;
  exportPid: number | null;
  exportChild: any;
  editorImportPid: number | null;
  editorImportChild: any;
  listeners: Map<string, Set<(payload: unknown) => void>>;
};

const state: ActiveProcessState = {
  detectPid: null,
  detectChild: null,
  exportPid: null,
  exportChild: null,
  editorImportPid: null,
  editorImportChild: null,
  listeners: new Map(),
};

const DEFAULT_CEP_SERVER_PORT = 38947;

function runtimeError(message: string): never {
  throw new Error(message);
}

function isCepRuntime(): boolean {
  if (typeof window === "undefined") return false;

  const w = window as any;

  return Boolean(w.__adobe_cep__) && Boolean(getNodeRequire());
}

function getNodeRequire(): any {
  const w = window as any;

  if (typeof w.require === "function") return w.require;
  if (w.cep_node && typeof w.cep_node.require === "function") {
    return w.cep_node.require;
  }

  return null;
}

function normalizeCepPath(rawPath: string): string {
  let value = String(rawPath || "");
  value = value.replace(/^file:\/\//i, "");

  try {
    value = decodeURIComponent(value);
  } catch {
    // ignore
  }

  if (/^\/[A-Za-z]:\//.test(value)) {
    value = value.slice(1);
  }

  return value.replace(/\//g, "\\");
}

function toFileUrl(filePath: string): string {
  const normalized = String(filePath || "").replace(/\\/g, "/");

  if (/^[a-z]+:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    return "file:///" + encodeURI(normalized);
  }

  return "file://" + encodeURI(normalized);
}

function emitEvent(eventName: string, payload: unknown): void {
  const bucket = state.listeners.get(eventName);
  if (!bucket) return;

  bucket.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // ignore listener exceptions
    }
  });
}

function listenLocal<T>(eventName: string, handler: ListenHandler<T>): Unlisten {
  const wrapped = (payload: unknown) => {
    handler({ payload: payload as T });
  };

  let bucket = state.listeners.get(eventName);
  if (!bucket) {
    bucket = new Set();
    state.listeners.set(eventName, bucket);
  }

  bucket.add(wrapped);

  return () => {
    const current = state.listeners.get(eventName);
    if (!current) return;

    current.delete(wrapped);

    if (current.size === 0) {
      state.listeners.delete(eventName);
    }
  };
}

function sanitizeEpisodeCacheId(value: string): string {
  const id = String(value || "").trim();

  if (!id) {
    runtimeError("episode_cache_id is empty");
  }

  if (id.length > 96) {
    runtimeError("episode_cache_id is too long");
  }

  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    runtimeError("episode_cache_id contains invalid characters");
  }

  return id;
}

function getCepContext() {
  if (!isCepRuntime()) {
    runtimeError("CEP runtime not detected");
  }

  const req = getNodeRequire();

  if (!req) {
    runtimeError("Node require unavailable in CEP");
  }

  const fs = req("fs") as any;
  const path = req("path") as any;
  const childProcess = req("child_process") as any;
  const os = req("os") as any;
  const crypto = req("crypto") as any;

  const cep = (window as any).__adobe_cep__;

  if (!cep || typeof cep.getSystemPath !== "function") {
    runtimeError("window.__adobe_cep__.getSystemPath unavailable");
  }

  const extensionRoot = normalizeCepPath(String(cep.getSystemPath("extension") || ""));
  const userDataRootRaw = String(cep.getSystemPath("userData") || "");
  const userDataRoot = normalizeCepPath(userDataRootRaw || extensionRoot);

  const appDataDir = path.join(userDataRoot, "AMVerge");
  const defaultEpisodesDir = path.join(appDataDir, "episodes");
  const mediaAssetsDir = path.join(appDataDir, "media_assets");
  const mergedPreviewDir = path.join(appDataDir, "merged_previews");
  const filmstripDir = path.join(appDataDir, "filmstrips");
  const iconsDir = path.join(appDataDir, "profile_icons");

  ensureDir(fs, appDataDir);
  ensureDir(fs, defaultEpisodesDir);
  ensureDir(fs, mediaAssetsDir);
  ensureDir(fs, mergedPreviewDir);
  ensureDir(fs, filmstripDir);
  ensureDir(fs, iconsDir);

  return {
    fs,
    path,
    childProcess,
    os,
    crypto,
    extensionRoot,
    appDataDir,
    defaultEpisodesDir,
    mediaAssetsDir,
    mergedPreviewDir,
    filmstripDir,
    iconsDir,
  };
}

function escapeJsxSingleQuoted(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function buildAfterEffectsImportEvalScript(mediaPaths: string[]): string {
  const literal = mediaPaths
    .map((raw) => normalizeCepPath(raw))
    .filter((raw) => raw.length > 0)
    .map((raw) => "'" + escapeJsxSingleQuoted(raw) + "'")
    .join(", ");

  return "$.amverge.importMediaIntoAfterEffects([" + literal + "])";
}

function evalCepHostScript(script: string): Promise<string> {
  if (!isCepRuntime()) {
    runtimeError("CEP runtime not detected");
  }

  const cep = (window as any).__adobe_cep__;
  if (!cep || typeof cep.evalScript !== "function") {
    runtimeError("window.__adobe_cep__.evalScript unavailable");
  }

  return new Promise((resolve, reject) => {
    try {
      cep.evalScript(script, (result: unknown) => {
        const text = String(result ?? "");
        if (!text || text === "EvalScript error." || text === "EvalScript error") {
          reject(new Error("After Effects host script failed to execute."));
          return;
        }
        resolve(text);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function ensureDir(fs: any, dirPath: string): void {
  if (!dirPath) return;

  try {
    if (fs.existsSync(dirPath)) return;
  } catch {
    // continue
  }

  const parts = String(dirPath).replace(/\\/g, "/").split("/");
  if (parts.length === 0) return;

  let current = "";

  if (/^[A-Za-z]:$/.test(parts[0])) {
    current = parts[0] + "\\";
    parts.shift();
  } else if (parts[0] === "") {
    current = "/";
    parts.shift();
  }

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) continue;

    current = current
      ? current.replace(/[\\/]$/, "") + "\\" + part
      : part;

    try {
      if (!fs.existsSync(current)) {
        fs.mkdirSync(current);
      }
    } catch {
      // ignore
    }
  }
}

function fileExists(fs: any, filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function removeFileIfExists(fs: any, filePath: string): void {
  if (!fileExists(fs, filePath)) return;

  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isFile() || stat.isSymbolicLink()) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore
  }
}

function removeDirRecursive(fs: any, dirPath: string): void {
  if (!fileExists(fs, dirPath)) return;

  let stat: any;

  try {
    stat = fs.lstatSync(dirPath);
  } catch {
    return;
  }

  if (!stat.isDirectory()) {
    removeFileIfExists(fs, dirPath);
    return;
  }

  let entries: string[] = [];

  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    entries = [];
  }

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const fullPath = dirPath.replace(/[\\/]$/, "") + "\\" + entry;

    let entryStat: any;

    try {
      entryStat = fs.lstatSync(fullPath);
    } catch {
      continue;
    }

    if (entryStat.isDirectory()) {
      removeDirRecursive(fs, fullPath);
    } else {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // ignore
      }
    }
  }

  try {
    fs.rmdirSync(dirPath);
  } catch {
    // ignore
  }
}

function copyFileToDir(fs: any, path: any, sourcePath: string, targetDir: string, targetName?: string): string {
  ensureDir(fs, targetDir);

  const fileName = targetName || path.basename(sourcePath);
  const targetPath = path.join(targetDir, fileName);

  fs.copyFileSync(sourcePath, targetPath);

  return targetPath;
}

function copyDirRecursive(fs: any, path: any, sourceDir: string, targetDir: string): void {
  ensureDir(fs, targetDir);

  let entries: string[] = [];

  try {
    entries = fs.readdirSync(sourceDir);
  } catch {
    entries = [];
  }

  for (let i = 0; i < entries.length; i += 1) {
    const name = entries[i];
    const src = path.join(sourceDir, name);
    const dst = path.join(targetDir, name);

    let stat: any;

    try {
      stat = fs.lstatSync(src);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      copyDirRecursive(fs, path, src, dst);
    } else if (stat.isFile()) {
      ensureDir(fs, path.dirname(dst));
      fs.copyFileSync(src, dst);
    }
  }
}

function moveDirContents(fs: any, path: any, sourceDir: string, targetDir: string): void {
  if (!fileExists(fs, sourceDir)) return;

  if (sourceDir.toLowerCase() === targetDir.toLowerCase()) {
    ensureDir(fs, targetDir);
    return;
  }

  ensureDir(fs, targetDir);

  let entries: string[] = [];

  try {
    entries = fs.readdirSync(sourceDir);
  } catch {
    entries = [];
  }

  for (let i = 0; i < entries.length; i += 1) {
    const name = entries[i];
    const src = path.join(sourceDir, name);
    const dst = path.join(targetDir, name);

    try {
      fs.renameSync(src, dst);
      continue;
    } catch {
      // fallback below
    }

    let stat: any;

    try {
      stat = fs.lstatSync(src);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      copyDirRecursive(fs, path, src, dst);
      removeDirRecursive(fs, src);
    } else if (stat.isFile()) {
      ensureDir(fs, path.dirname(dst));
      fs.copyFileSync(src, dst);
      try {
        fs.unlinkSync(src);
      } catch {
        // ignore
      }
    }
  }
}

function clearFilesInDir(fs: any, dirPath: string): void {
  if (!fileExists(fs, dirPath)) return;

  let entries: string[] = [];

  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    entries = [];
  }

  for (let i = 0; i < entries.length; i += 1) {
    const full = dirPath.replace(/[\\/]$/, "") + "\\" + entries[i];

    try {
      const stat = fs.lstatSync(full);
      if (stat.isDirectory()) {
        removeDirRecursive(fs, full);
      } else {
        fs.unlinkSync(full);
      }
    } catch {
      // ignore
    }
  }
}

function resolveToolPath(fs: any, path: any, extensionRoot: string, exeName: string): string {
  const candidates = [
    path.join(extensionRoot, "backend", "bin", exeName),
    path.join(
      extensionRoot,
      "frontend",
      "src-tauri",
      "bin",
      "backend_script-x86_64-pc-windows-msvc",
      "_internal",
      exeName
    ),
    path.join(
      extensionRoot,
      "frontend",
      "src-tauri",
      "bin",
      "backend_script-x86_64-pc-windows-msvc",
      exeName
    ),
    path.join(extensionRoot, "bin", exeName),
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    if (fileExists(fs, candidates[i])) {
      return candidates[i];
    }
  }

  runtimeError(exeName + " not found");
}

function resolveBackendRunner(fs: any, path: any, extensionRoot: string) {
  const backendExe = path.join(
    extensionRoot,
    "frontend",
    "src-tauri",
    "bin",
    "backend_script-x86_64-pc-windows-msvc",
    "backend_script.exe"
  );

  if (fileExists(fs, backendExe)) {
    return {
      exe: backendExe,
      argsPrefix: [] as string[],
      cwd: path.dirname(backendExe),
    };
  }

  const scriptPath = path.join(extensionRoot, "backend", "app.py");
  const venvPython = path.join(extensionRoot, "backend", "venv", "Scripts", "python.exe");

  if (!fileExists(fs, scriptPath)) {
    runtimeError("backend/app.py not found");
  }

  return {
    exe: fileExists(fs, venvPython) ? venvPython : "python",
    argsPrefix: [scriptPath],
    cwd: path.dirname(scriptPath),
  };
}

function markProcess(kind: "detect" | "export" | "editor", child: any): void {
  const pid = Number(child && child.pid ? child.pid : 0) || null;

  if (kind === "detect") {
    state.detectChild = child;
    state.detectPid = pid;
    return;
  }

  if (kind === "export") {
    state.exportChild = child;
    state.exportPid = pid;
    return;
  }

  state.editorImportChild = child;
  state.editorImportPid = pid;
}

function clearProcess(kind: "detect" | "export" | "editor"): void {
  if (kind === "detect") {
    state.detectChild = null;
    state.detectPid = null;
    return;
  }

  if (kind === "export") {
    state.exportChild = null;
    state.exportPid = null;
    return;
  }

  state.editorImportChild = null;
  state.editorImportPid = null;
}

function spawnCapture(options: {
  childProcess: any;
  exe: string;
  args: string[];
  cwd?: string;
  taskKind?: "detect" | "export" | "editor";
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
}): Promise<{ code: number; stdout: string; stderr: string }> {
  const childProcess = options.childProcess;

  return new Promise((resolve, reject) => {
    let child: any;

    try {
      child = childProcess.spawn(options.exe, options.args, {
        cwd: options.cwd,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      reject(error);
      return;
    }

    if (options.taskKind) {
      markProcess(options.taskKind, child);
    }

    let stdout = "";
    let stderr = "";
    let stdoutBuf = "";
    let stderrBuf = "";

    const flushBufferedLine = (buf: string, cb?: (line: string) => void) => {
      if (!buf || !cb) return;
      cb(buf);
    };

    child.stdout.on("data", (chunk: any) => {
      const text = String(chunk || "");
      stdout += text;

      if (!options.onStdoutLine) return;

      stdoutBuf += text;
      const lines = stdoutBuf.split(/\r?\n/);
      stdoutBuf = lines.pop() || "";

      for (let i = 0; i < lines.length; i += 1) {
        options.onStdoutLine(lines[i]);
      }
    });

    child.stderr.on("data", (chunk: any) => {
      const text = String(chunk || "");
      stderr += text;

      if (!options.onStderrLine) return;

      stderrBuf += text;
      const lines = stderrBuf.split(/\r?\n/);
      stderrBuf = lines.pop() || "";

      for (let i = 0; i < lines.length; i += 1) {
        options.onStderrLine(lines[i]);
      }
    });

    child.on("error", (error: unknown) => {
      if (options.taskKind) {
        clearProcess(options.taskKind);
      }
      reject(error);
    });

    child.on("close", (code: number | null) => {
      flushBufferedLine(stdoutBuf, options.onStdoutLine);
      flushBufferedLine(stderrBuf, options.onStderrLine);

      if (options.taskKind) {
        clearProcess(options.taskKind);
      }

      resolve({
        code: code == null ? 0 : code,
        stdout,
        stderr,
      });
    });
  });
}

async function killProcessTree(childProcess: any, pid: number | null): Promise<void> {
  if (!pid) return;

  await new Promise<void>((resolve) => {
    let killer: any;

    try {
      killer = childProcess.spawn("taskkill", ["/F", "/T", "/PID", String(pid)], {
        windowsHide: true,
        stdio: "ignore",
      });
    } catch {
      resolve();
      return;
    }

    killer.on("error", () => resolve());
    killer.on("close", () => resolve());
  });
}

function normalizePathForFfmpeg(pathValue: string): string {
  return String(pathValue || "").replace(/\\/g, "/");
}

function parseCommandProgress(line: string): { percent: number; message: string } | null {
  const prefix = "PROGRESS|";
  if (!line || line.indexOf(prefix) !== 0) return null;

  const payload = line.slice(prefix.length);
  const splitIndex = payload.indexOf("|");
  if (splitIndex < 0) return null;

  const percent = Number.parseInt(payload.slice(0, splitIndex).trim(), 10);
  const message = payload.slice(splitIndex + 1);

  if (!Number.isFinite(percent)) return null;

  return {
    percent,
    message,
  };
}

function profileToVideoArgs(codec: string): string[] {
  switch (codec) {
    case "h264_main":
      return ["-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium"];
    case "h264_high":
      return ["-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium"];
    case "h264_high10":
      return ["-c:v", "libx264", "-profile:v", "high10", "-pix_fmt", "yuv420p10le", "-crf", "20", "-preset", "medium"];
    case "h264_high422":
      return ["-c:v", "libx264", "-profile:v", "high422", "-pix_fmt", "yuv422p", "-crf", "20", "-preset", "medium"];
    case "h265_main":
      return ["-c:v", "libx265", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "medium"];
    case "h265_main10":
      return ["-c:v", "libx265", "-pix_fmt", "yuv420p10le", "-crf", "22", "-preset", "medium"];
    case "h265_main12":
      return ["-c:v", "libx265", "-pix_fmt", "yuv420p12le", "-crf", "22", "-preset", "medium"];
    case "h265_main422_10":
      return ["-c:v", "libx265", "-pix_fmt", "yuv422p10le", "-crf", "22", "-preset", "medium"];
    case "av1_main":
    case "av1":
      return ["-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium"];
    case "prores_422_lt":
      return ["-c:v", "prores_ks", "-profile:v", "1", "-pix_fmt", "yuv422p10le"];
    case "prores_422":
      return ["-c:v", "prores_ks", "-profile:v", "2", "-pix_fmt", "yuv422p10le"];
    case "prores_422_hq":
      return ["-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le"];
    case "prores_4444":
      return ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le"];
    case "prores_4444_xq":
      return ["-c:v", "prores_ks", "-profile:v", "5", "-pix_fmt", "yuva444p10le"];
    case "dnxhr_lb":
      return ["-c:v", "dnxhd", "-profile:v", "dnxhr_lb", "-pix_fmt", "yuv422p"];
    case "dnxhr_sq":
      return ["-c:v", "dnxhd", "-profile:v", "dnxhr_sq", "-pix_fmt", "yuv422p"];
    case "dnxhr_hq":
      return ["-c:v", "dnxhd", "-profile:v", "dnxhr_hq", "-pix_fmt", "yuv422p"];
    case "dnxhr_hqx":
      return ["-c:v", "dnxhd", "-profile:v", "dnxhr_hqx", "-pix_fmt", "yuv422p10le"];
    case "dnxhr_444":
      return ["-c:v", "dnxhd", "-profile:v", "dnxhr_444", "-pix_fmt", "yuv444p10le"];
    case "uncompressed_rgb8":
      return ["-c:v", "rawvideo", "-pix_fmt", "rgb24"];
    case "uncompressed_rgb10":
      return ["-c:v", "rawvideo", "-pix_fmt", "gbrp10le"];
    case "uncompressed_rgba8":
      return ["-c:v", "rawvideo", "-pix_fmt", "rgba"];
    case "uncompressed_rgba16":
      return ["-c:v", "rawvideo", "-pix_fmt", "rgba64le"];
    case "cineform":
      return ["-c:v", "cfhd", "-pix_fmt", "yuv422p10le"];
    case "h264":
      return ["-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium"];
    case "h265":
      return ["-c:v", "libx265", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "medium"];
    default:
      return ["-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium"];
  }
}

function profileToAudioArgs(audioMode: string): string[] {
  switch (audioMode) {
    case "none":
      return ["-an"];
    case "copy":
      return ["-c:a", "copy"];
    case "aac":
      return ["-c:a", "aac", "-b:a", "192k"];
    case "aac_320":
      return ["-c:a", "aac", "-b:a", "320k"];
    case "pcm16":
      return ["-c:a", "pcm_s16le"];
    case "pcm24":
      return ["-c:a", "pcm_s24le"];
    case "flac":
      return ["-c:a", "flac"];
    case "alac":
      return ["-c:a", "alac"];
    case "opus":
      return ["-c:a", "libopus", "-b:a", "160k"];
    case "mp3":
      return ["-c:a", "libmp3lame", "-b:a", "320k"];
    default:
      return ["-c:a", "aac", "-b:a", "192k"];
  }
}

function parseExportOptions(raw: any) {
  const options = raw || {};

  return {
    workflow: String(options.workflow || "video_encode"),
    codec: String(options.codec || "h264_high"),
    audioMode: String(options.audioMode || "aac"),
    hardwareMode: String(options.hardwareMode || "auto"),
    parallelExports: Number(options.parallelExports || 1),
  };
}

function buildExportOutputPath(path: any, templatePath: string, index: number, total: number): string {
  const parsed = path.parse(templatePath);
  const name = parsed.name || "clip";
  const ext = parsed.ext || ".mp4";

  if (name.indexOf("####") >= 0) {
    const resolvedName = name.replace(/####/g, String(index).padStart(4, "0"));
    return path.join(parsed.dir, resolvedName + ext);
  }

  if (total <= 1) {
    return templatePath;
  }

  return path.join(parsed.dir, name + "_" + String(index).padStart(4, "0") + ext);
}

function writeConcatList(fs: any, path: any, listFilePath: string, clips: string[]): void {
  const rows: string[] = [];

  for (let i = 0; i < clips.length; i += 1) {
    const normalized = normalizePathForFfmpeg(clips[i]).replace(/'/g, "'\\''");
    rows.push("file '" + normalized + "'");
  }

  ensureDir(fs, path.dirname(listFilePath));
  fs.writeFileSync(listFilePath, rows.join("\n"), "utf8");
}

async function runEncodeExport(options: {
  childProcess: any;
  ffmpegPath: string;
  inputPath: string;
  outputPath: string;
  exportOptions: any;
  taskKind?: "detect" | "export" | "editor";
}): Promise<{ code: number; stdout: string; stderr: string }> {
  const exportOptions = parseExportOptions(options.exportOptions);
  const videoArgs = profileToVideoArgs(exportOptions.codec);
  const audioArgs = profileToAudioArgs(exportOptions.audioMode);

  const args = ["-y", "-i", options.inputPath, "-map", "0:v:0", "-map", "0:a?"].concat(videoArgs).concat(audioArgs);

  if (options.outputPath.toLowerCase().endsWith(".mp4")) {
    args.push("-movflags", "+faststart");
  }

  args.push(options.outputPath);

  return spawnCapture({
    childProcess: options.childProcess,
    exe: options.ffmpegPath,
    args,
    taskKind: options.taskKind,
  });
}

async function runRemuxExport(options: {
  childProcess: any;
  ffmpegPath: string;
  inputPath: string;
  outputPath: string;
  taskKind?: "detect" | "export" | "editor";
}): Promise<{ code: number; stdout: string; stderr: string }> {
  return spawnCapture({
    childProcess: options.childProcess,
    exe: options.ffmpegPath,
    args: ["-y", "-i", options.inputPath, "-map", "0:v:0", "-map", "0:a?", "-c", "copy", options.outputPath],
    taskKind: options.taskKind,
  });
}

async function ensurePreviewProxyInternal(clipPath: string): Promise<string> {
  const ctx = getCepContext();
  const fs = ctx.fs;
  const path = ctx.path;
  const childProcess = ctx.childProcess;

  const ffmpegPath = resolveToolPath(fs, path, ctx.extensionRoot, "ffmpeg.exe");

  const parsed = path.parse(clipPath);
  const proxyPath = path.join(parsed.dir, parsed.name + ".preview.mp4");
  const tmpPath = path.join(parsed.dir, parsed.name + ".preview.tmp.mp4");

  if (fileExists(fs, proxyPath)) {
    try {
      const stat = fs.statSync(proxyPath);
      if (stat.size > 0) {
        return proxyPath;
      }
    } catch {
      // continue
    }
  }

  removeFileIfExists(fs, tmpPath);

  const run = await spawnCapture({
    childProcess,
    exe: ffmpegPath,
    args: [
      "-y",
      "-i",
      clipPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      tmpPath,
    ],
  });

  if (run.code !== 0 || !fileExists(fs, tmpPath)) {
    runtimeError((run.stderr || "").trim() || "FFmpeg proxy encode failed");
  }

  try {
    const stat = fs.statSync(tmpPath);
    if (!stat || stat.size <= 0) {
      removeFileIfExists(fs, tmpPath);
      runtimeError("Generated proxy is empty");
    }
  } catch {
    removeFileIfExists(fs, tmpPath);
    runtimeError("Generated proxy is empty");
  }

  removeFileIfExists(fs, proxyPath);

  try {
    fs.renameSync(tmpPath, proxyPath);
  } catch {
    fs.copyFileSync(tmpPath, proxyPath);
    removeFileIfExists(fs, tmpPath);
  }

  return proxyPath;
}

async function ensureMergedPreviewInternal(srcs: string[]): Promise<string> {
  if (!Array.isArray(srcs) || srcs.length === 0) {
    runtimeError("srcs is empty");
  }

  if (srcs.length === 1) {
    return ensurePreviewProxyInternal(String(srcs[0]));
  }

  const ctx = getCepContext();
  const fs = ctx.fs;
  const path = ctx.path;
  const childProcess = ctx.childProcess;
  const crypto = ctx.crypto;

  const ffmpegPath = resolveToolPath(fs, path, ctx.extensionRoot, "ffmpeg.exe");

  const hash = crypto
    .createHash("sha1")
    .update(JSON.stringify(srcs))
    .digest("hex")
    .slice(0, 16);

  const mergedPath = path.join(ctx.mergedPreviewDir, "merged_preview_" + hash + ".mp4");
  const listPath = path.join(ctx.mergedPreviewDir, "concat_" + hash + ".txt");

  if (fileExists(fs, mergedPath)) {
    try {
      const stat = fs.statSync(mergedPath);
      if (stat.size > 0) {
        return mergedPath;
      }
    } catch {
      // continue
    }
  }

  writeConcatList(fs, path, listPath, srcs);

  let run = await spawnCapture({
    childProcess,
    exe: ffmpegPath,
    args: ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", mergedPath],
  });

  if (run.code !== 0) {
    run = await spawnCapture({
      childProcess,
      exe: ffmpegPath,
      args: [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        mergedPath,
      ],
    });

    if (run.code !== 0) {
      removeFileIfExists(fs, listPath);
      runtimeError((run.stderr || "").trim() || "Merged preview generation failed");
    }
  }

  removeFileIfExists(fs, listPath);

  return mergedPath;
}

function parseBool(value: unknown): boolean {
  return value === true || String(value).toLowerCase() === "true";
}

function getCustomEpisodesRoot(path: any, defaultEpisodesDir: string, customPath: unknown): string {
  if (customPath == null) return defaultEpisodesDir;

  const raw = String(customPath || "").trim();
  if (!raw) return defaultEpisodesDir;

  return path.resolve(raw);
}

function defaultGpuCapabilities() {
  return {
    hasGpuEncoder: false,
    preferredBackend: "none",
    availableBackends: [],
    availableVideoEncoders: [],
    h264Encoder: null,
    h265Encoder: null,
    av1Encoder: null,
    maxParallelExports: 1,
  };
}

async function handleInvoke(command: string, args?: Record<string, unknown>): Promise<unknown> {
  const ctx = getCepContext();
  const fs = ctx.fs;
  const path = ctx.path;
  const childProcess = ctx.childProcess;
  const crypto = ctx.crypto;

  if (command === "hover_preview_error") {
    return null;
  }

  if (command === "start_discord_rpc") return null;
  if (command === "stop_discord_rpc") return null;
  if (command === "update_discord_rpc") return null;
  if (command === "abort_editor_import") {
    await killProcessTree(childProcess, state.editorImportPid);
    clearProcess("editor");
    return null;
  }

  if (command === "abort_detect_scenes") {
    await killProcessTree(childProcess, state.detectPid);
    clearProcess("detect");
    return null;
  }

  if (command === "abort_export") {
    await killProcessTree(childProcess, state.exportPid);
    clearProcess("export");
    return null;
  }

  if (command === "get_default_episodes_dir") {
    return ctx.defaultEpisodesDir;
  }

  if (command === "move_episodes_to_new_dir") {
    const oldDirRaw = args && Object.prototype.hasOwnProperty.call(args, "oldDir") ? args.oldDir : null;
    const newDirRaw = args && Object.prototype.hasOwnProperty.call(args, "newDir") ? args.newDir : null;

    const oldDir = oldDirRaw ? path.resolve(String(oldDirRaw)) : ctx.defaultEpisodesDir;
    const newDir = newDirRaw ? path.resolve(String(newDirRaw)) : ctx.defaultEpisodesDir;

    ensureDir(fs, oldDir);
    ensureDir(fs, newDir);

    moveDirContents(fs, path, oldDir, newDir);

    return oldDir;
  }

  if (command === "clear_episode_panel_cache") {
    const customRoot = getCustomEpisodesRoot(path, ctx.defaultEpisodesDir, args ? args.customPath : null);

    removeDirRecursive(fs, customRoot);
    ensureDir(fs, customRoot);

    return null;
  }

  if (command === "delete_episode_cache") {
    const rawId = String((args && args.episodeCacheId) || "");
    const id = sanitizeEpisodeCacheId(rawId);
    const customRoot = getCustomEpisodesRoot(path, ctx.defaultEpisodesDir, args ? args.customPath : null);
    const targetDir = path.join(customRoot, id);

    removeDirRecursive(fs, targetDir);

    return null;
  }

  if (command === "fetch_startup_notification") {
    return null;
  }

  if (command === "detect_nvidia_encoder_profile") {
    return {
      hasNvidiaGpu: false,
      gpuName: null,
      profile: "unsupported",
    };
  }

  if (command === "detect_gpu_encoder_capabilities") {
    return defaultGpuCapabilities();
  }

  if (command === "submit_bug_report") {
    const reportDir = path.join(ctx.appDataDir, "bug_reports");
    ensureDir(fs, reportDir);

    const now = new Date();
    const stamp = now
      .toISOString()
      .replace(/[:.]/g, "-");

    const reportId = "report-" + stamp;
    const filePath = path.join(reportDir, reportId + ".json");

    try {
      const request = (args && args.request) || {};
      fs.writeFileSync(filePath, JSON.stringify(request, null, 2), "utf8");
    } catch {
      return {
        ok: false,
        message: "Failed to save bug report locally",
      };
    }

    return {
      ok: true,
      message: "Bug report saved locally",
      reportId,
    };
  }

  if (command === "save_background_image") {
    const sourcePath = String((args && args.sourcePath) || "").trim();
    if (!sourcePath) runtimeError("sourcePath is empty");

    const ext = path.extname(sourcePath) || ".png";
    const targetName = "background_" + Date.now() + ext;
    const storedPath = copyFileToDir(fs, path, sourcePath, ctx.mediaAssetsDir, targetName);

    return storedPath;
  }

  if (command === "crop_and_save_image") {
    const sourcePath = String((args && args.sourcePath) || "").trim();
    if (!sourcePath) runtimeError("sourcePath is empty");

    const ext = path.extname(sourcePath) || ".png";
    const targetName = "background_crop_" + Date.now() + ext;
    const storedPath = copyFileToDir(fs, path, sourcePath, ctx.mediaAssetsDir, targetName);

    return storedPath;
  }

  if (command === "crop_and_save_profile_icon") {
    const sourcePath = String((args && args.sourcePath) || "").trim();
    const iconId = String((args && args.iconId) || "icon").replace(/[^A-Za-z0-9_-]/g, "_");

    if (!sourcePath) runtimeError("sourcePath is empty");

    const ext = path.extname(sourcePath) || ".png";
    const targetName = iconId + ext;
    const storedPath = copyFileToDir(fs, path, sourcePath, ctx.iconsDir, targetName);

    return storedPath;
  }

  if (command === "delete_profile_icon_file") {
    const iconPath = String((args && args.iconPath) || "").trim();

    if (!iconPath) return null;

    const cleanPath = iconPath.split("?")[0];
    const resolved = path.resolve(cleanPath);

    if (resolved.toLowerCase().indexOf(ctx.iconsDir.toLowerCase()) !== 0) {
      return null;
    }

    removeFileIfExists(fs, resolved);

    return null;
  }

  if (command === "reveal_in_file_manager") {
    const filePath = String((args && args.filePath) || "").trim();
    if (!filePath) return null;

    const resolved = path.resolve(filePath);
    const exists = fileExists(fs, resolved);

    if (exists) {
      try {
        childProcess.spawn("explorer.exe", ["/select,", resolved], {
          windowsHide: true,
          detached: true,
          stdio: "ignore",
        }).unref();
      } catch {
        // ignore
      }
      return null;
    }

    const parent = path.dirname(resolved);

    try {
      childProcess.spawn("explorer.exe", [parent], {
        windowsHide: true,
        detached: true,
        stdio: "ignore",
      }).unref();
    } catch {
      // ignore
    }

    return null;
  }

  if (command === "check_hevc") {
    const videoPath = String((args && args.videoPath) || "").trim();
    if (!videoPath) runtimeError("video_path is empty");

    const ffprobePath = resolveToolPath(fs, path, ctx.extensionRoot, "ffprobe.exe");

    const run = await spawnCapture({
      childProcess,
      exe: ffprobePath,
      args: [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name",
        "-of",
        "default=nk=1:nw=1",
        videoPath,
      ],
    });

    if (run.code !== 0) {
      runtimeError((run.stderr || "").trim() || "ffprobe failed");
    }

    return (run.stdout || "").trim().toLowerCase() === "hevc";
  }

  if (command === "detect_scenes") {
    const videoPath = String((args && args.videoPath) || "").trim();
    if (!videoPath) runtimeError("video_path is empty");

    const episodeCacheIdRaw = args && args.episodeCacheId != null ? String(args.episodeCacheId) : "";
    const customRoot = getCustomEpisodesRoot(path, ctx.defaultEpisodesDir, args ? args.customPath : null);

    ensureDir(fs, customRoot);

    const outputDir = episodeCacheIdRaw
      ? path.join(customRoot, sanitizeEpisodeCacheId(episodeCacheIdRaw))
      : customRoot;

    ensureDir(fs, outputDir);
    clearFilesInDir(fs, outputDir);

    const runner = resolveBackendRunner(fs, path, ctx.extensionRoot);

    const run = await spawnCapture({
      childProcess,
      exe: runner.exe,
      args: runner.argsPrefix.concat([videoPath, outputDir]),
      cwd: runner.cwd,
      taskKind: "detect",
      onStderrLine: (line) => {
        const parsed = parseCommandProgress(line);
        if (!parsed) return;

        emitEvent("scene_progress", {
          percent: parsed.percent,
          message: parsed.message,
        });
      },
    });

    if (run.code !== 0) {
      runtimeError((run.stderr || "").trim() || "Scene detection failed");
    }

    const stdout = (run.stdout || "").trim();
    const clipsJson = stdout || "[]";

    emitEvent("initial_clips_ready", {
      clips_json: clipsJson,
    });

    emitEvent("processing_complete", null);

    return clipsJson;
  }

  if (command === "ensure_preview_proxy") {
    const clipPath = String((args && args.clipPath) || "").trim();
    if (!clipPath) runtimeError("clip_path is empty");

    return ensurePreviewProxyInternal(clipPath);
  }

  if (command === "ensure_merged_preview") {
    const srcs = (args && Array.isArray(args.srcs) ? args.srcs : []) as string[];
    return ensureMergedPreviewInternal(srcs);
  }

  if (command === "generate_filmstrip") {
    const videoPath = String((args && args.videoPath) || "").trim();
    const outputDir = String((args && args.outputDir) || "").trim();
    const duration = Number((args && args.duration) || 0);
    const frameCount = Math.max(1, Number((args && args.frameCount) || 8));
    const thumbWidth = Math.max(1, Number((args && args.thumbWidth) || 160));
    const thumbHeight = Math.max(1, Number((args && args.thumbHeight) || 90));
    const startTimeRaw = args && args.startTime != null ? Number(args.startTime) : null;

    if (!videoPath) runtimeError("videoPath is empty");

    const ffmpegPath = resolveToolPath(fs, path, ctx.extensionRoot, "ffmpeg.exe");

    const hash = crypto
      .createHash("sha1")
      .update(JSON.stringify([videoPath, duration, frameCount, thumbWidth, thumbHeight, startTimeRaw]))
      .digest("hex")
      .slice(0, 16);

    const baseName = path.basename(videoPath).replace(/\.[^.]+$/, "");
    const outputRoot = outputDir ? path.resolve(outputDir) : ctx.filmstripDir;
    ensureDir(fs, outputRoot);

    const outputPath = path.join(outputRoot, baseName + ".filmstrip." + hash + ".jpg");

    if (fileExists(fs, outputPath)) {
      try {
        const stat = fs.statSync(outputPath);
        if (stat.size > 0) {
          return outputPath;
        }
      } catch {
        // continue
      }
    }

    const fps = duration > 0 ? Math.max(0.5, frameCount / Math.max(0.1, duration)) : 2;

    const vf =
      "fps=" +
      String(fps) +
      ",scale=" +
      String(thumbWidth) +
      ":" +
      String(thumbHeight) +
      ":force_original_aspect_ratio=decrease,pad=" +
      String(thumbWidth) +
      ":" +
      String(thumbHeight) +
      ":(ow-iw)/2:(oh-ih)/2:black,tile=" +
      String(frameCount) +
      "x1";

    const argsList: string[] = ["-y"];

    if (startTimeRaw != null && Number.isFinite(startTimeRaw) && startTimeRaw > 0) {
      argsList.push("-ss", String(startTimeRaw));
    }

    argsList.push("-i", videoPath);

    if (duration > 0 && Number.isFinite(duration)) {
      argsList.push("-t", String(duration));
    }

    argsList.push("-vf", vf, "-frames:v", "1", "-q:v", "3", outputPath);

    const run = await spawnCapture({
      childProcess,
      exe: ffmpegPath,
      args: argsList,
    });

    if (run.code !== 0 || !fileExists(fs, outputPath)) {
      runtimeError((run.stderr || "").trim() || "Filmstrip generation failed");
    }

    return outputPath;
  }

  if (command === "export_clips") {
    const clips = (args && Array.isArray(args.clips) ? args.clips : []) as string[];
    const savePath = String((args && args.savePath) || "").trim();
    const mergeEnabled = parseBool(args ? args.mergeEnabled : false);
    const exportOptionsRaw = args ? args.exportOptions : null;
    const exportOptions = parseExportOptions(exportOptionsRaw);

    if (!savePath) runtimeError("save_path is empty");
    if (!clips.length) return [];

    const ffmpegPath = resolveToolPath(fs, path, ctx.extensionRoot, "ffmpeg.exe");

    const outputParent = path.dirname(savePath);
    ensureDir(fs, outputParent);

    const exportedFiles: string[] = [];

    emitEvent("scene_progress", {
      percent: 5,
      message: "Preparing export...",
    });

    if (mergeEnabled) {
      const outPath = savePath;
      const listPath = path.join(outputParent, "amverge_export_merge_" + Date.now() + ".txt");

      writeConcatList(fs, path, listPath, clips);

      let run;

      if (exportOptions.workflow === "video_remux") {
        run = await spawnCapture({
          childProcess,
          exe: ffmpegPath,
          args: ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath],
          taskKind: "export",
        });

        if (run.code !== 0) {
          run = await spawnCapture({
            childProcess,
            exe: ffmpegPath,
            args: [
              "-y",
              "-f",
              "concat",
              "-safe",
              "0",
              "-i",
              listPath,
              "-c:v",
              "libx264",
              "-profile:v",
              "high",
              "-pix_fmt",
              "yuv420p",
              "-crf",
              "20",
              "-preset",
              "medium",
              "-c:a",
              "aac",
              "-b:a",
              "192k",
              outPath,
            ],
            taskKind: "export",
          });
        }
      } else {
        const videoArgs = profileToVideoArgs(exportOptions.codec);
        const audioArgs = profileToAudioArgs(exportOptions.audioMode);

        const encodeArgs = ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-map", "0:v:0", "-map", "0:a?"]
          .concat(videoArgs)
          .concat(audioArgs);

        if (outPath.toLowerCase().endsWith(".mp4")) {
          encodeArgs.push("-movflags", "+faststart");
        }

        encodeArgs.push(outPath);

        run = await spawnCapture({
          childProcess,
          exe: ffmpegPath,
          args: encodeArgs,
          taskKind: "export",
        });
      }

      removeFileIfExists(fs, listPath);

      if (!run || run.code !== 0) {
        runtimeError((run && run.stderr ? run.stderr : "").trim() || "Export merge failed");
      }

      exportedFiles.push(outPath);

      emitEvent("scene_progress", {
        percent: 100,
        message: "Export complete",
      });

      return exportedFiles;
    }

    for (let i = 0; i < clips.length; i += 1) {
      const clipPath = String(clips[i] || "");
      const outPath = buildExportOutputPath(path, savePath, i, clips.length);

      emitEvent("scene_progress", {
        percent: Math.max(5, Math.floor(((i + 1) / clips.length) * 95)),
        message: "Exporting clip " + String(i + 1) + "/" + String(clips.length),
      });

      let run;

      if (exportOptions.workflow === "video_remux") {
        run = await runRemuxExport({
          childProcess,
          ffmpegPath,
          inputPath: clipPath,
          outputPath: outPath,
          taskKind: "export",
        });

        if (run.code !== 0) {
          run = await runEncodeExport({
            childProcess,
            ffmpegPath,
            inputPath: clipPath,
            outputPath: outPath,
            exportOptions,
            taskKind: "export",
          });
        }
      } else {
        run = await runEncodeExport({
          childProcess,
          ffmpegPath,
          inputPath: clipPath,
          outputPath: outPath,
          exportOptions,
          taskKind: "export",
        });
      }

      if (!run || run.code !== 0) {
        runtimeError((run && run.stderr ? run.stderr : "").trim() || "Export failed");
      }

      exportedFiles.push(outPath);
    }

    emitEvent("scene_progress", {
      percent: 100,
      message: "Export complete",
    });

    return exportedFiles;
  }

  if (command === "import_media_to_editor") {
    const editorTarget = String((args && args.editorTarget) || "")
      .trim()
      .toLowerCase();
    const targetAliases = new Set(["after_effects", "aftereffects", "after-effects"]);

    if (!targetAliases.has(editorTarget)) {
      runtimeError(`Unsupported editor target in CEP mode: ${editorTarget || "unknown"}`);
    }

    const mediaPaths = (args && Array.isArray(args.mediaPaths) ? args.mediaPaths : [])
      .map((value) => normalizeCepPath(String(value || "").trim()))
      .filter((value) => value.length > 0);

    if (mediaPaths.length === 0) {
      runtimeError("media_paths is empty");
    }

    const evalScript = buildAfterEffectsImportEvalScript(mediaPaths);
    const rawResult = await evalCepHostScript(evalScript);
    const pipeIndex = rawResult.indexOf("|");
    const status = pipeIndex >= 0 ? rawResult.slice(0, pipeIndex) : "ERR";
    const message = pipeIndex >= 0 ? rawResult.slice(pipeIndex + 1) : rawResult;

    if (status === "ERR") {
      runtimeError(message || "After Effects import failed.");
    }

    if (status === "WARN") {
      return "After Effects import warning: " + message;
    }

    return message || "After Effects import complete.";
  }

  runtimeError("Unsupported command in CEP mode: " + command);
}

function parseDialogExtensions(filters?: Array<{ name: string; extensions: string[] }>): string[] {
  if (!Array.isArray(filters)) return [];

  const all: string[] = [];

  for (let i = 0; i < filters.length; i += 1) {
    const filter = filters[i];
    if (!filter || !Array.isArray(filter.extensions)) continue;

    for (let j = 0; j < filter.extensions.length; j += 1) {
      const ext = String(filter.extensions[j] || "").replace(/^\*\./, "").replace(/^\./, "");
      if (!ext) continue;
      all.push("*." + ext);
    }
  }

  return all;
}

function normalizeDialogResultData(data: any): string[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.map((v) => String(v));
  return [String(data)];
}

function openDialogInternal(options: CepDialogArgs): string | string[] | null {
  if (!isCepRuntime()) return null;

  const cepFs = (window as any).cep && (window as any).cep.fs;
  if (!cepFs) return null;

  const title = options.title || (options.directory ? "Select folder" : "Select file");
  const fileTypes = parseDialogExtensions(options.filters);

  const result = cepFs.showOpenDialogEx(
    Boolean(options.multiple),
    Boolean(options.directory),
    title,
    options.defaultPath || "",
    fileTypes.length > 0 ? fileTypes : undefined,
    "",
    "Open"
  );

  if (!result || result.err !== 0) return null;

  const items = normalizeDialogResultData(result.data);
  if (!items.length) return null;

  if (options.multiple) {
    return items;
  }

  return items[0];
}

function saveDialogInternal(options: CepSaveDialogArgs): string | null {
  if (!isCepRuntime()) return null;

  const cepFs = (window as any).cep && (window as any).cep.fs;
  if (!cepFs || typeof cepFs.showSaveDialogEx !== "function") {
    if (typeof window !== "undefined" && typeof window.prompt === "function") {
      const fallback = window.prompt("Save path", options.defaultPath || "");
      return fallback && fallback.trim() ? fallback.trim() : null;
    }

    return null;
  }

  const pathInfo = getCepContext().path;
  const defaultPath = options.defaultPath || "";
  const defaultName = defaultPath ? pathInfo.basename(defaultPath) : "";
  const initialDir = defaultPath ? pathInfo.dirname(defaultPath) : "";
  const fileTypes = parseDialogExtensions(options.filters);

  const result = cepFs.showSaveDialogEx(
    options.title || "Save file",
    initialDir,
    defaultName,
    fileTypes.length > 0 ? fileTypes : undefined
  );

  if (!result || result.err !== 0) return null;

  const items = normalizeDialogResultData(result.data);
  if (!items.length) return null;

  return items[0];
}

async function openExternalInternal(url: string): Promise<void> {
  if (!url) return;

  if (isCepRuntime()) {
    const w = window as any;

    if (w.cep && w.cep.util && typeof w.cep.util.openURLInDefaultBrowser === "function") {
      w.cep.util.openURLInDefaultBrowser(url);
      return;
    }

    const req = getNodeRequire();
    if (req) {
      const childProcess = req("child_process");
      childProcess.exec('start "" "' + String(url).replace(/"/g, "") + '"');
      return;
    }
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return (await handleInvoke(command, args)) as T;
}

export async function listen<T>(eventName: string, handler: ListenHandler<T>): Promise<Unlisten> {
  return listenLocal<T>(eventName, handler);
}

export function convertFileSrc(filePath: string): string {
  return toFileUrl(filePath);
}

export async function open(options: CepDialogArgs): Promise<string | string[] | null> {
  return openDialogInternal(options);
}

export async function save(options: CepSaveDialogArgs): Promise<string | null> {
  return saveDialogInternal(options);
}

export async function openExternal(url: string): Promise<void> {
  await openExternalInternal(url);
}

export function getCurrentWebview() {
  return {
    onDragDropEvent: onDragDropEvent,
  };
}

export type DragDropPayload = {
  type: "over" | "drop" | "leave";
  paths?: string[];
};

export async function onDragDropEvent(
  handler: (event: { payload: DragDropPayload }) => void
): Promise<Unlisten> {
  const toPaths = (event: DragEvent): string[] => {
    const files = event.dataTransfer && event.dataTransfer.files;
    if (!files || files.length === 0) return [];

    const paths: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i] as any;

      if (file && typeof file.path === "string" && file.path) {
        paths.push(String(file.path));
      }
    }

    return paths;
  };

  const onOver = (event: DragEvent) => {
    event.preventDefault();

    handler({
      payload: {
        type: "over",
        paths: toPaths(event),
      },
    });
  };

  const onLeave = (event: DragEvent) => {
    event.preventDefault();

    handler({
      payload: {
        type: "leave",
      },
    });
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();

    handler({
      payload: {
        type: "drop",
        paths: toPaths(event),
      },
    });
  };

  window.addEventListener("dragover", onOver);
  window.addEventListener("dragleave", onLeave);
  window.addEventListener("drop", onDrop);

  return () => {
    window.removeEventListener("dragover", onOver);
    window.removeEventListener("dragleave", onLeave);
    window.removeEventListener("drop", onDrop);
  };
}

export function isCepMode(): boolean {
  return isCepRuntime();
}

export function getCepServerUrl(): string {
  return "http://127.0.0.1:" + String(DEFAULT_CEP_SERVER_PORT);
}
