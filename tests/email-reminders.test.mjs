import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadTsModule(path) {
  const source = fs.readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require,
    process,
    Buffer,
    console,
  };
  vm.runInNewContext(output, context, { filename: path });
  return module.exports;
}

const core = loadTsModule("lib/appointment-reminder-core.ts");
const auth = loadTsModule("lib/appointment-reminder-auth.ts");
const secret = loadTsModule("lib/email-settings-secret.ts");

test("calcula ventana de recordatorio con horas previas y margen", () => {
  const window = core.reminderWindow({
    now: new Date("2026-06-06T10:00:00.000Z"),
    hoursBefore: 24,
    lookaheadMinutes: 15,
  });

  assert.equal(window.start.toISOString(), "2026-06-07T10:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-06-07T10:15:00.000Z");
});

test("filtra turnos ya recordados, terminales, sin email o fuera de ventana", () => {
  const window = {
    start: new Date("2026-06-07T10:00:00.000Z"),
    end: new Date("2026-06-07T10:15:00.000Z"),
  };
  const base = {
    fecha_hora: "2026-06-07T10:05:00.000Z",
    estado: "Pendiente",
    expand: { paciente_id: { email: "paciente@example.com" } },
  };

  assert.equal(core.shouldSendAppointmentReminder(base, window), true);
  assert.equal(core.shouldSendAppointmentReminder({ ...base, recordatorio_email_enviado_at: "2026-06-06T10:00:00Z" }, window), false);
  assert.equal(core.shouldSendAppointmentReminder({ ...base, estado: "Cancelado" }, window), false);
  assert.equal(core.shouldSendAppointmentReminder({ ...base, expand: { paciente_id: { email: "" } } }, window), false);
  assert.equal(core.shouldSendAppointmentReminder({ ...base, fecha_hora: "2026-06-07T10:20:00.000Z" }, window), false);
});

test("valida secreto de cron solo cuando coincide y esta configurado", () => {
  assert.equal(auth.isValidReminderCronSecret("abc", "abc"), true);
  assert.equal(auth.isValidReminderCronSecret("abc", "otro"), false);
  assert.equal(auth.isValidReminderCronSecret("", ""), false);
});

test("cifra y descifra App Password sin exponer texto plano", () => {
  process.env.EMAIL_SETTINGS_ENCRYPTION_KEY = "clave-local-de-prueba";
  const encrypted = secret.encryptEmailSecret("app-password");

  assert.notEqual(encrypted, "app-password");
  assert.equal(secret.decryptEmailSecret(encrypted), "app-password");
});
