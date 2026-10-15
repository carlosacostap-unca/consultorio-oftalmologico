import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";

const packageDir = path.resolve(process.argv[2] || "dist-desktop/win-unpacked");
const reportPath = path.resolve(process.argv[3] || "output/desktop-sync-pilot/runtime-verification.json");
const python = process.argv[4];
if (!python || !path.isAbsolute(python)) throw new Error("Indicar la ruta absoluta del Python de verificación.");
const executable = path.join(packageDir, "Consultorio Oftalmológico.exe");
const resources = path.join(packageDir, "resources");
const hooks = path.join(resources, "pocketbase", "pb_hooks");
assert.match(await readFile(path.join(hooks, "sync_queue.js"), "utf8"), /runInTransaction/);
assert.match(await readFile(path.join(hooks, "sync_queue.pb.js"), "utf8"), /sync_queue\.js/);
await mkdir(path.dirname(reportPath), { recursive: true });
await mkdir(path.resolve(".tmp"), { recursive: true });
const root = await mkdtemp(path.resolve(".tmp/packaged-sync-pilot-"));
const profile = path.join(root, "new-profile");
const environment = {};
for (const [key, value] of Object.entries(process.env)) {
  if (/^(?:systemroot|windir|path|pathext|temp|tmp|appdata|localappdata|userprofile|comspec|number_of_processors|homedrive|homepath)$/i.test(key)) environment[key] = value;
}
let stdout = "";
let stderr = "";
const child = spawn(executable, ["--smoke-test", `--smoke-test-profile=${profile}`], {
  cwd: packageDir, windowsHide: true, env: environment, stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (data) => { stdout = (stdout + data).slice(-4000); });
child.stderr.on("data", (data) => { stderr = (stderr + data).slice(-4000); });
const exitCode = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => { child.kill(); reject(new Error("El arranque empaquetado excedió 60 segundos; revisar sólo su perfil sintético.")); }, 60_000);
  child.once("error", (error) => { clearTimeout(timeout); reject(error); });
  child.once("exit", (code) => { clearTimeout(timeout); resolve(code); });
});
assert.equal(exitCode, 0, "El runtime empaquetado no terminó correctamente");
assert.equal(JSON.parse(await readFile(path.join(profile, "smoke-test-profile.json"), "utf8")).syntheticOnly, true);
const log = await readFile(path.join(profile, "logs", "desktop.log"), "utf8");
assert.match(log, /Smoke test del runtime completado/);
assert.doesNotMatch(log, /Fallo el inicio de la aplicacion/);
const identity = JSON.parse(await readFile(path.join(profile, "device.json"), "utf8"));
assert.ok(identity.deviceId);
const db = path.join(profile, "pocketbase", "pb_data", "data.db");
const sqlite = spawnSync(python, ["-c", [
  "import sqlite3,sys,json,pathlib",
  "con=sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri()+'?mode=ro',uri=True)",
  "tables=['pacientes','consultas','recetas','sync_operations','sync_local_conflicts']",
  "print(json.dumps({'integrity':con.execute('PRAGMA integrity_check').fetchone()[0],'foreignKeys':con.execute('PRAGMA foreign_key_check').fetchall(),'counts':{name:con.execute('SELECT COUNT(*) FROM '+name).fetchone()[0] for name in tables}}))",
  "con.close()",
].join("\n"), db], { windowsHide: true, encoding: "utf8" });
assert.equal(sqlite.status, 0, "No se pudo comprobar la base sintética en modo de sólo lectura");
const checks = JSON.parse(sqlite.stdout);
assert.equal(checks.integrity, "ok");
assert.deepEqual(checks.foreignKeys, []);
assert.ok(Object.values(checks.counts).every((count) => count === 0));
const runtime = {
  passed: true, syntheticOnly: true, packagedExecutable: executable, profile,
  cleanChildEnvironment: true, remoteConfigurationInjected: false, runtimeExitCode: exitCode,
  completedMarker: true, shippedTransactionalHooks: true, realUserProfileOpened: false,
  sqliteReadOnlyChecks: checks,
  applicationArchiveSha256: createHash("sha256").update(await readFile(path.join(resources, "app.asar"))).digest("hex"),
  capturedOutputBytes: Buffer.byteLength(stdout) + Buffer.byteLength(stderr),
};
await writeFile(reportPath, JSON.stringify(runtime, null, 2) + "\n");
console.log(JSON.stringify({ passed: true, reportPath, profile, clinicalRecords: 0, realUserProfileOpened: false }));
