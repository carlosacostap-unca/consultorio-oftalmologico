import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

// Exercise the shipped renderer without sending requests to a real clinical API.
const appRoot = path.resolve(process.argv[2] || "dist-desktop/win-unpacked/resources/app");
const port = 3198;
const origin = `http://127.0.0.1:${port}`;
const doctor = { id: "doctorfixture01", nombre: "Medico de prueba", email: "fixture@example.invalid", role: "medico", roles: ["medico"] };
const patient = {
  id: "patientfixture1", nombre: "PACIENTE", apellido: "PRUEBA CRONOLOGICA",
  numero_ficha: "TEST", ant_diabetes: true, ant_maculopatia: false, ant_otra: "",
};
const latest = {
  id: "latestfixture01", paciente_id: patient.id, medico_id: doctor.id,
  fecha: "2026-06-30 12:00:00.000Z", created: "2026-08-02 14:54:52.727Z",
  estado: "finalizada", ant_diabetes: false, ant_maculopatia: true, ant_otra: "UVEITIS",
  motivo_consulta: "Consulta clinicamente mas reciente", expand: { medico_id: doctor },
};
const older = {
  ...latest, id: "olderfixture001", fecha: "2026-05-15 12:00:00.000Z",
  created: "2026-08-02 15:09:38.885Z", ant_maculopatia: false, ant_otra: "",
};
const token = `fixture.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
const server = spawn(process.execPath, [path.join(appRoot, "server.js")], {
  cwd: appRoot, windowsHide: true,
  env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
const requests = [];
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk; });
server.stderr.on("data", (chunk) => { serverOutput += chunk; });
let browser;
try {
  for (let attempt = 0; attempt < 600; attempt++) {
    if (server.exitCode !== null) throw new Error(`Servidor finalizado: ${serverOutput}`);
    if (await fetch(origin).then((response) => response.ok).catch(() => false)) break;
    if (attempt === 599) throw new Error("El renderer no inicio a tiempo");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript(({ token, doctor }) => {
    localStorage.setItem("pocketbase_auth", JSON.stringify({ token, model: doctor }));
  }, { token, doctor });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const list = (items) => ({ page: 1, perPage: 30, totalItems: items.length, totalPages: items.length ? 1 : 0, items });
    const respond = (data) => route.fulfill({ json: data });
    if (url.pathname.startsWith("/api/")) {
      requests.push({ path: url.pathname, method: request.method(), sort: url.searchParams.get("sort") });
      if (request.method() !== "GET") return route.fulfill({ status: 405, json: { message: "Solo lectura en esta prueba" } });
      const match = url.pathname.match(/^\/api\/collections\/([^/]+)\/records(?:\/([^/]+))?$/);
      if (match) {
        const [, collection, id] = match;
        if (collection === "pacientes") return respond(id ? patient : list([patient]));
        if (collection === "users") return respond(id ? doctor : list([doctor]));
        if (collection === "consultas") {
          if (id) return respond(id === latest.id ? latest : older);
          await new Promise((resolve) => setTimeout(resolve, 250));
          const sort = url.searchParams.get("sort") || "";
          const items = [latest, older].sort((a, b) => {
            for (const field of sort.split(",")) {
              const key = field.replace(/^-/, "");
              const compared = String(a[key] || "").localeCompare(String(b[key] || ""));
              if (compared) return field.startsWith("-") ? -compared : compared;
            }
            return 0;
          });
          return respond(list(items.slice(0, Number(url.searchParams.get("perPage") || 30))));
        }
        return respond(list([]));
      }
      if (url.pathname === "/api/medicos") return respond({ medicos: [doctor] });
      return respond({});
    }
    if (url.origin === origin) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(`${origin}/consultas/${latest.id}?mode=view`);
  const diabetes = page.getByRole("button", { name: "DIABETES", exact: true });
  const maculopatia = page.getByRole("button", { name: "MACULOPATIA", exact: true });
  await page.getByRole("link", { name: "Nueva consulta", exact: true }).last().waitFor();
  await page.waitForFunction(() => document.querySelector('input[name="ant_otra"]')?.value === "UVEITIS");
  await page.getByRole("link", { name: "Nueva consulta", exact: true }).last().click();
  await page.waitForURL("**/consultas/nueva?paciente_id=*");
  await diabetes.waitFor();
  await page.waitForFunction(() => document.querySelector('input[name="ant_otra"]')?.value === "UVEITIS", { }, { timeout: 8000 });
  assert.equal(await diabetes.getAttribute("aria-pressed"), "true");
  assert.equal(await maculopatia.getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator('input[name="ant_otra"]:visible').inputValue(), "UVEITIS");
  assert.ok(requests.every((request) => request.method === "GET"));
  await mkdir("output/playwright", { recursive: true });
  await page.screenshot({ path: "output/playwright/antecedentes-cronologia.png" });
  console.log("APROBADO: consulta previa -> Nueva consulta conserva Diabetes, Maculopatia y UVEITIS pese al orden inverso de importacion. Solo datos sinteticos; cero escrituras API.");
} catch (error) {
  console.error("RECHAZADO:", error.message);
  console.error("Ordenes solicitados:", JSON.stringify(requests.filter((item) => item.path.endsWith("/consultas/records"))));
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
}
