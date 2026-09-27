import { createRequire } from "node:module";
import path from "node:path";
import { readdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { listPackage, statFile } = require("@electron/asar");

const REQUIRED_FILES = [
  "app.asar",
  "app/server.js",
  "app/.next/BUILD_ID",
  "pocketbase/pocketbase.exe",
];

const REQUIRED_DIRECTORIES = [
  "app/.next/server",
  "app/.next/static",
  "app/public",
  "app/node_modules",
  "pocketbase/pb_migrations",
  "pocketbase/pb_hooks",
];

const DATABASE_FILE = /(?:\.(?:dbf|dbt|fpt|cdx|mdx|ndx|db|sqlite|sqlite3)(?:-(?:wal|shm|journal))?|-(?:wal|shm|journal))$/i;

export class DesktopPackageContentError extends Error {
  constructor(code, message, violations = []) {
    super(message);
    this.name = "DesktopPackageContentError";
    this.code = code;
    this.violations = violations;
  }
}

export function normalizePackagePath(value, { allowLeadingSeparator = false } = {}) {
  const original = String(value ?? "");
  if (!original || original.includes("\0")) throw invalidPath();
  const slashPath = original.replaceAll("\\", "/");
  if (!allowLeadingSeparator && (/^\//.test(slashPath) || /^[a-z]:\//i.test(slashPath))) {
    throw invalidPath();
  }

  const segments = slashPath.replace(/^\/+/, "").split("/");
  const normalized = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") throw invalidPath();
    const windowsCanonical = segment.replace(/[ .]+$/u, "").toLowerCase();
    if (!windowsCanonical || windowsCanonical === "..") throw invalidPath();
    normalized.push(windowsCanonical);
  }
  if (normalized.length === 0) throw invalidPath();
  return normalized.join("/");
}

export function findPackageContentViolations(entries) {
  const violations = [];
  for (const entry of entries) {
    let normalized;
    try {
      normalized = normalizePackagePath(entry.path, {
        allowLeadingSeparator: entry.source === "asar",
      });
    } catch {
      violations.push(violation("invalid_path", "ruta inválida dentro de resources"));
      continue;
    }

    const segments = normalized.split("/");
    const filename = segments.at(-1);
    if (entry.kind === "symlink") {
      violations.push(violation("symlink", "enlace o junction dentro de resources"));
      continue;
    }
    if (segments.includes("pb_data")) {
      violations.push(violation("pocketbase_runtime_data", "segmento pb_data"));
      continue;
    }
    if (isClinicalDataPath(segments, entry.source)) {
      violations.push(violation("clinical_data", clinicalRoot(entry.source)));
      continue;
    }
    if (filename.endsWith(".nft.json")) {
      violations.push(violation(
        "build_trace",
        entry.source === "asar" ? "app.asar" : "manifiesto *.nft.json dentro de resources",
      ));
      continue;
    }
    if (entry.kind === "file" && DATABASE_FILE.test(filename)) {
      violations.push(violation("active_database", "archivo de base activa dentro de resources"));
      continue;
    }
    if (segments[0] === "pocketbase" && !isAllowedPocketBasePath(segments)) {
      violations.push(violation("unexpected_pocketbase_resource", "pocketbase (contenido fuera de allowlist)"));
    }
  }
  return deduplicateViolations(violations);
}

export async function verifyDesktopPackageResources(resourcesRoot, {
  asarEntries = inspectAsarEntries,
} = {}) {
  const absoluteRoot = path.resolve(resourcesRoot);
  const filesystemEntries = await collectFilesystemEntries(absoluteRoot);
  const entryMap = new Map(filesystemEntries.map((entry) => [
    normalizePackagePath(entry.path),
    entry.kind,
  ]));
  const missing = [
    ...REQUIRED_FILES.filter((item) => entryMap.get(item.toLowerCase()) !== "file"),
    ...REQUIRED_DIRECTORIES.filter((item) => entryMap.get(item.toLowerCase()) !== "directory"),
  ];
  if (missing.length > 0) {
    throw new DesktopPackageContentError(
      "incomplete_package",
      `El paquete no contiene recursos obligatorios: ${missing.join(", ")}`,
    );
  }

  const archivePath = path.join(absoluteRoot, "app.asar");
  let archiveEntries;
  try {
    archiveEntries = asarEntries(archivePath);
  } catch {
    throw new DesktopPackageContentError(
      "asar_unreadable",
      "No se pudo inspeccionar app.asar.",
    );
  }
  const entries = [
    ...filesystemEntries,
    ...archiveEntries.map((archiveEntry) => typeof archiveEntry === "string"
      ? {
          path: archiveEntry,
          kind: archiveEntry.endsWith("/") || archiveEntry.endsWith("\\") ? "directory" : "file",
          source: "asar",
        }
      : { ...archiveEntry, source: "asar" }),
  ];
  const violations = findPackageContentViolations(entries);
  if (violations.length > 0) {
    const summary = violations.map(({ code, reportedPath }) => `${code}: ${reportedPath}`).join("; ");
    throw new DesktopPackageContentError(
      "forbidden_package_content",
      `El paquete contiene material prohibido (${summary}).`,
      violations,
    );
  }
  return { resourcesRoot: absoluteRoot, inspectedEntries: entries.length };
}

function inspectAsarEntries(archivePath) {
  return listPackage(archivePath).map((entryPath) => {
    const stat = statFile(archivePath, entryPath.replace(/^[\\/]+/u, ""), false);
    return {
      path: entryPath,
      kind: stat.link ? "symlink" : stat.files ? "directory" : "file",
    };
  });
}

export async function findPackagedResourceRoots(outputDirectory) {
  const absoluteOutput = path.resolve(outputDirectory);
  let entries;
  try {
    entries = await readdir(absoluteOutput, { withFileTypes: true });
  } catch {
    throw new DesktopPackageContentError(
      "package_output_missing",
      "No existe la salida de electron-builder que debe verificarse.",
    );
  }
  const roots = entries
    .filter((entry) => entry.isDirectory() && entry.name.toLowerCase().endsWith("-unpacked"))
    .map((entry) => path.join(absoluteOutput, entry.name, "resources"));
  if (roots.length === 0) {
    throw new DesktopPackageContentError(
      "package_output_missing",
      "No se encontró ningún directorio *-unpacked/resources para verificar.",
    );
  }
  return roots;
}

async function collectFilesystemEntries(root) {
  const result = [];
  await walk(root, "");
  return result;

  async function walk(current, relative) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      throw new DesktopPackageContentError(
        "resources_unreadable",
        "No se pudo recorrer el directorio resources del paquete.",
      );
    }
    for (const entry of entries) {
      const entryRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const kind = entry.isSymbolicLink()
        ? "symlink"
        : entry.isDirectory()
          ? "directory"
          : "file";
      result.push({ path: entryRelative, kind, source: "filesystem" });
      if (kind === "directory") await walk(path.join(current, entry.name), entryRelative);
    }
  }
}

function isClinicalDataPath(segments, source) {
  if (source === "asar") return segments[0] === "data" || (segments[0] === "app" && segments[1] === "data");
  return (segments[0] === "app" && segments[1] === "data")
    || (segments[0] === "app.asar.unpacked" && segments[1] === "data")
    || (segments[0] === "app.asar.unpacked" && segments[1] === "app" && segments[2] === "data");
}

function isAllowedPocketBasePath(segments) {
  if (segments.length === 1) return true;
  if (segments.length === 2 && segments[1] === "pocketbase.exe") return true;
  return segments[1] === "pb_migrations" || segments[1] === "pb_hooks";
}

function clinicalRoot(source) {
  return source === "asar" ? "app.asar (directorio data)" : "app/data";
}

function violation(code, reportedPath) {
  return { code, reportedPath };
}

function deduplicateViolations(violations) {
  return [...new Map(violations.map((item) => [`${item.code}:${item.reportedPath}`, item])).values()];
}

function invalidPath() {
  return new DesktopPackageContentError("invalid_path", "Ruta de paquete inválida.");
}
