import fs from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const DEMO_PASSWORD = "Consultorio123!";
const DEMO_DATE = "2026-05-15";
const DEMO_SLOT = "09:30";
const QUICK_SLOT = "09:00";
const OVERBOOKING_SLOT = "09:15";
const DEMO_PATIENT_DOCUMENT = "99000001";
const OCCUPIED_PATIENT_DOCUMENT = "99000002";
const ADMIN_SECRETARY_EMAIL = "admin.secretaria.demo@consultorio.local";
const PATIENT_SEARCH_PLACEHOLDER = /Buscar por apellido, nombre/;
const ACTIVE_ROLE_HEADER = "x-active-role";
const TEST_PB_MARKERS = ["test", "testing", "localhost", "127.0.0.1"];

test.describe("roles y otorgamiento de turnos", () => {
  test("secretaria ingresa y puede ver todos los medicos", async ({ page }) => {
    await login(page, "secretaria.demo@consultorio.local");

    await expect(page.getByText("Rol activo: Secretaria")).toBeVisible();
    await page.goto("/turnos");

    const doctorSelect = page.locator("main select").first();
    await expect(doctorSelect).toBeEnabled();
    await expect(doctorSelect).toHaveValue("all");
    await expect(doctorSelect.locator("option", { hasText: "Todos los medicos" })).toHaveCount(1);
    await expect(doctorSelect.locator("option", { hasText: "Medico Demo" })).toHaveCount(1);
    await expect(doctorSelect.locator("option", { hasText: "Medico Dos Demo" })).toHaveCount(1);
  });

  test("secretaria cambia entre agendas de dos medicos", async ({ page }) => {
    await login(page, "secretaria.demo@consultorio.local");

    await page.goto("/turnos");
    const doctorSelect = page.locator("main select").first();
    await doctorSelect.selectOption({ label: "Medico Dos Demo" });
    await expect(doctorSelect.locator("option:checked")).toHaveText("Medico Dos Demo");

    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);

    await expect(page.getByRole("heading", { name: "Medico Dos Demo" })).toBeVisible();
    await expect(page.getByText(/10:00.*11:00.*Consulta/)).toBeVisible();
    await expect(page.getByText(/OCUPADO DEMO, PACIENTE/)).toHaveCount(0);
  });

  test("secretaria ve la agenda diaria agrupada por medico", async ({ page }) => {
    await login(page, "secretaria.demo@consultorio.local");

    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);

    await expect(page.getByText("Tablero operativo diario")).toBeVisible();
    await expect(page.getByText("Vista agrupada por medico")).toBeVisible();
    await expect(page.getByText(/Mostrando 1 de 1 turnos filtrados/)).toBeVisible();
    await expect(page.getByText("Turnos: 1")).toBeVisible();
    await expect(page.getByText("Proximo turno", { exact: true })).toBeVisible();
    await expect(page.getByText(/09:15.*OCUPADO DEMO, PACIENTE/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "En espera" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Medico Demo" })).toBeVisible();
    await expect(page.getByText(/09:00.*12:00.*Consulta/)).toBeVisible();
    await expect(page.getByText("OCUPADO DEMO, PACIENTE", { exact: true })).toBeVisible();
  });

  test("secretaria filtra la agenda diaria sin perder la ocupacion de disponibilidades", async ({ page }) => {
    await login(page, "secretaria.demo@consultorio.local");

    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);

    await expect(page.getByRole("button", { name: /09:15.*Ocupado/ })).toBeVisible();
    await page.getByRole("button", { name: "Atendidos" }).click();

    await expect(page.getByText(/Mostrando 0 de 1 turnos filtrados/)).toBeVisible();
    await expect(page.getByText("No hay turnos que coincidan con la busqueda o el filtro seleccionado.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /09:00.*Libre/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /09:15.*Ocupado/ })).toBeVisible();
  });

  test("secretaria gestiona sala de espera por estado", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    const patient = await findDemoPatient(request, env, adminToken, DEMO_PATIENT_DOCUMENT);
    expect(patient).toBeTruthy();
    const motivo = `Playwright sala ${Date.now()}`;
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, DEMO_SLOT);

    try {
      await createDemoAppointment(request, env, adminToken, medicoId, patient!.id as string, motivo, DEMO_SLOT, "");

      await login(page, "secretaria.demo@consultorio.local");
      await page.goto("/turnos");
      await page.getByRole("button", { name: "Sala de espera" }).click();
      await page.locator('main input[type="date"]').fill(DEMO_DATE);

      await expect(page.getByRole("heading", { name: "Sala de espera" })).toBeVisible();
      await expect(page.getByText(/Proximos: 1/)).toBeVisible();

      const card = page.getByText(motivo).locator("xpath=ancestor::div[contains(@class,'px-5 py-4')][1]");
      await expect(card.getByText("Medico Demo")).toBeVisible();
      await card.getByRole("button", { name: "Llego" }).click();

      await expect(page.getByText(/En espera: 2/)).toBeVisible();
      await expect(
        await findDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT, "En espera")
      ).toBeTruthy();
    } finally {
      await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT);
    }
  });

  test("secretaria crea turno rapido desde agenda diaria", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de turno" })).toBeVisible();
    await expect(page.getByLabel("Resumen del turno")).toContainText("Medico Demo");
    await expect(page.getByLabel("Resumen del turno")).toContainText("09:00");
    await expect(page.getByText("Turno regular")).toBeVisible();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();
    await expect(page.getByText("Paciente seleccionado")).toBeVisible();

    const motivo = `Playwright rapido ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de turno" })).toBeHidden();
    await expect(page.getByText("Turno creado")).toBeVisible();
    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await expect(await findDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT)).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria crea paciente desde alta rapida de turno", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    const document = `98${Date.now().toString().slice(-6)}`;
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);
    await cleanupDemoPatient(request, env, adminToken, document);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();

    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(document);
    await expect(page.getByText("No encontramos pacientes para esa busqueda.")).toBeVisible();
    await page.getByRole("button", { name: "+ Nuevo" }).click();
    await page.getByPlaceholder("Apellido", { exact: true }).fill("Alta Rapida");
    await page.getByPlaceholder("Nombre", { exact: true }).fill("Paciente");
    await page.getByPlaceholder("DNI", { exact: true }).fill(document);
    await page.getByPlaceholder("Telefono", { exact: true }).fill("111-222");
    await page.getByPlaceholder("Obra social", { exact: true }).fill("Demo Salud");
    await page.getByRole("button", { name: "Crear y seleccionar" }).click();

    await expect(page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER)).toHaveValue(/Alta Rapida, Paciente/);
    await expect(page.getByText("Paciente seleccionado")).toBeVisible();
    const motivo = `Playwright paciente rapido ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de turno" })).toBeHidden();
    await expect(await findDemoPatient(request, env, adminToken, document)).toBeTruthy();
    await expect(await findDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT)).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
    await cleanupDemoPatient(request, env, adminToken, document);
  });

  test("secretaria confirma advertencias antes de guardar turno con paciente ya agendado", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();

    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(OCCUPIED_PATIENT_DOCUMENT);
    await page.getByText(/Ocupado Demo, Paciente/).click();
    await expect(page.getByText("Advertencias del paciente")).toBeVisible();
    await expect(page.getByText("Este paciente tiene proximos turnos activos.")).toBeVisible();
    await expect(page.getByText("Hay un turno activo con este mismo medico.")).toBeVisible();

    const motivo = `Playwright advertencia ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await expect(page.getByRole("button", { name: "Guardar turno" })).toBeDisabled();
    await page.getByLabel("Revise las advertencias y quiero guardar el turno igual.").check();
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de turno" })).toBeHidden();
    await expect(page.getByText("Turno creado")).toBeVisible();
    await expect.poll(
      () => findDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT),
      { timeout: 10_000 }
    ).toBeTruthy();
    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria usa acciones rapidas de estado en la agenda diaria", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright estado rapido ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();
    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();

    const row = page
      .getByRole("button", { name: `Gestionar turno ${motivo}` })
      .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    await row.getByRole("button", { name: "Atendido" }).click();
    await expect(row.getByRole("combobox", { name: "Cambiar estado" })).toHaveValue("Atendido");
    await expect
      .poll(() => findDemoAppointmentEvents(request, env, adminToken, medicoId, motivo, QUICK_SLOT, "status_changed"), {
        timeout: 10_000,
      })
      .toHaveLength(1);

    await page.getByRole("button", { name: `Gestionar turno ${motivo}` }).click();
    await page.getByRole("button", { name: "Historial" }).click();
    await expect(page.getByText("Cambio de estado")).toBeVisible();
    await expect(page.getByText("En espera -> Atendido", { exact: true }).first()).toBeVisible();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria debe indicar motivo para marcar ausente", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright ausente ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();
    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();

    const row = page
      .getByRole("button", { name: `Gestionar turno ${motivo}` })
      .locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    await row.getByRole("button", { name: "Ausente", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Motivo requerido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar estado" })).toBeDisabled();
    await page.getByPlaceholder("Ej: El paciente no asistio...").fill("No asistio a la prueba automatizada");
    await page.getByRole("button", { name: "Guardar estado" }).click();

    await expect(row.getByRole("combobox", { name: "Cambiar estado" })).toHaveValue("Ausente");
    await expect
      .poll(() => findDemoAppointmentEvents(request, env, adminToken, medicoId, motivo, QUICK_SLOT, "status_changed"), {
        timeout: 10_000,
      })
      .toHaveLength(1);

    await page.getByRole("button", { name: `Gestionar turno ${motivo}` }).click();
    await page.getByRole("button", { name: "Historial" }).click();
    await expect(page.getByText("No asistio a la prueba automatizada")).toBeVisible();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria cancela turno desde agenda diaria conservando historial", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright cancelar ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await page.getByRole("button", { name: `Gestionar turno ${motivo}` }).click();
    await page.getByRole("button", { name: "Cancelacion" }).click();
    await page.getByPlaceholder("Ej: El paciente solicito cancelar...").fill("Prueba automatizada de cancelacion");
    await page.getByRole("button", { name: "Cancelar turno" }).click();

    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await expect.poll(
      () => findDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT, "Cancelado"),
      { timeout: 10_000 }
    ).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, QUICK_SLOT);
  });

  test("secretaria reprograma turno desde agenda diaria", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, QUICK_SLOT);
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, DEMO_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*Libre/ }).click();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright reprogramar ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar turno" }).click();

    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await page.getByRole("button", { name: `Gestionar turno ${motivo}` }).click();
    await page.getByRole("button", { name: "Reprogramar", exact: true }).click();
    await page.getByRole("button", { name: /Reprogramar a 09:30/ }).click();
    await page.getByRole("button", { name: "Reprogramar turno" }).click();

    await expect.poll(
      () => findDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT),
      { timeout: 10_000 }
    ).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, DEMO_SLOT);
  });

  test("secretaria crea sobreturno desde slot ocupado", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId, undefined, OVERBOOKING_SLOT);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos");
    await page.getByRole("button", { name: "Agenda Diaria" }).click();
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:15.*Ocupado/ }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de sobreturno" })).toBeVisible();
    await expect(page.getByLabel("Resumen del turno")).toContainText("09:15");
    await expect(page.getByText("Sobreturno sobre horario ocupado")).toBeVisible();
    await expect(page.getByText("Se guardara como sobreturno y quedara asociado a esta disponibilidad.")).toBeVisible();
    await page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER).fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();
    await expect(page.getByText("Paciente seleccionado")).toBeVisible();

    const motivo = `Playwright sobreturno ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general").fill(motivo);
    await page.getByRole("button", { name: "Guardar sobreturno" }).click();

    await expect(page.getByRole("heading", { name: "Alta rapida de sobreturno" })).toBeHidden();
    await expect(page.getByText("Turno creado")).toBeVisible();
    await expect(page.getByRole("button", { name: `Gestionar turno ${motivo}` })).toBeVisible();
    await expect(await findDemoAppointment(request, env, adminToken, medicoId, motivo, OVERBOOKING_SLOT)).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo, OVERBOOKING_SLOT);
  });

  test("usuario multi rol ingresa como medico y puede cambiar a secretaria", async ({ page }) => {
    await login(page, "multi.demo@consultorio.local");

    await expect(page.getByText("Rol activo: Medico")).toBeVisible();
    await expect(page.getByText(/selecciona.*rol|elegi.*rol|elige.*rol/i)).toHaveCount(0);

    const roleSelect = page.locator("aside select");
    await expect(roleSelect).toHaveValue("medico");
    await roleSelect.selectOption("secretaria");

    await expect(page.getByText("Rol activo: Secretaria")).toBeVisible();
    await page.goto("/turnos");
    await expect(page.locator("main select").first()).toHaveValue("all");
  });

  test("usuario admin operativo cambia a secretaria y pierde permisos admin", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const userToken = await getUserToken(request, env, ADMIN_SECRETARY_EMAIL);

    await login(page, ADMIN_SECRETARY_EMAIL);

    await expect(page.getByText("Rol activo: Admin")).toBeVisible();
    await expect(page.locator("aside").getByText("Configuracion")).toBeVisible();
    await expect(page.locator("aside").getByRole("link", { name: "Permisos" })).toBeVisible();

    const adminResponse = await request.get("/api/usuarios", {
      headers: {
        Authorization: `Bearer ${userToken}`,
        [ACTIVE_ROLE_HEADER]: "admin",
      },
    });
    expect(adminResponse.status()).toBe(200);

    await page.locator("aside select").selectOption("secretaria");
    await expect(page.getByText("Rol activo: Secretaria")).toBeVisible();
    await expect(page.locator("aside").getByText("Configuracion")).toHaveCount(0);
    await expect(page.locator("aside").getByRole("link", { name: "Permisos" })).toHaveCount(0);

    const secretaryResponse = await request.get("/api/usuarios", {
      headers: {
        Authorization: `Bearer ${userToken}`,
        [ACTIVE_ROLE_HEADER]: "secretaria",
      },
    });
    expect(secretaryResponse.status()).toBe(403);
  });

  test("secretaria otorga un turno regular desde disponibilidad demo", async ({ page, request }) => {
    const env = loadTestEnv();
    assertTestingPocketBase(env);
    const adminToken = await getAdminToken(request, env);
    const medicoId = await getUserIdByEmail(request, env, adminToken, "medico.demo@consultorio.local");
    await cleanupDemoAppointment(request, env, adminToken, medicoId);

    await login(page, "secretaria.demo@consultorio.local");
    await page.goto("/turnos/nuevo");

    await page.locator("main select").first().selectOption({ label: "Medico Demo" });
    await page.locator('main input[type="date"]').fill(DEMO_DATE);
    await page.getByRole("button", { name: /09:00.*12:00.*Consulta/ }).click();

    await expect(page.getByRole("button", { name: /09:15 Ocupado/ })).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`${DEMO_SLOT} Libre`) }).click();

    const patientSearch = page.getByPlaceholder(PATIENT_SEARCH_PLACEHOLDER);
    await patientSearch.fill(DEMO_PATIENT_DOCUMENT);
    await page.getByText(/Libre Demo, Paciente/).click();

    const motivo = `Playwright turno ${Date.now()}`;
    await page.getByPlaceholder("Ej: Control general, receta lentes...").fill(motivo);
    await page.getByRole("button", { name: "Agendar Turno" }).click();

    await expect(page).toHaveURL(new RegExp(`/turnos\\?medico_id=${medicoId}`));
    await expect(page.locator("main select").first()).toHaveValue(medicoId);
    await expect(await findDemoAppointment(request, env, adminToken, medicoId, motivo)).toBeTruthy();

    await cleanupDemoAppointment(request, env, adminToken, medicoId, motivo);
  });

  test("medico crea turnos solo para su propia agenda", async ({ page }) => {
    await login(page, "medico.demo@consultorio.local");

    await expect(page.getByText("Rol activo: Medico")).toBeVisible();
    await page.goto("/turnos/nuevo");

    const doctorSelect = page.locator("main select").first();
    await expect(doctorSelect).toBeDisabled();
    await expect(doctorSelect.locator("option:checked")).toHaveText("Medico Demo");
  });
});

async function login(page: Page, email: string) {
  await page.goto("/");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.locator("aside")).toBeVisible();
}

async function getAdminToken(request: APIRequestContext, env: Record<string, string>) {
  const baseURL = pocketBaseUrl(env);
  const body = {
    identity: env.POCKETBASE_ADMIN_EMAIL,
    password: env.POCKETBASE_ADMIN_PASSWORD,
  };

  let response = await request.post(`${baseURL}/api/collections/_superusers/auth-with-password`, { data: body });
  if (!response.ok()) {
    response = await request.post(`${baseURL}/api/admins/auth-with-password`, { data: body });
  }

  expect(response.ok()).toBeTruthy();
  return (await response.json()).token as string;
}

async function getUserToken(request: APIRequestContext, env: Record<string, string>, email: string) {
  const response = await request.post(`${pocketBaseUrl(env)}/api/collections/users/auth-with-password`, {
    data: {
      identity: email,
      password: DEMO_PASSWORD,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()).token as string;
}

async function getUserIdByEmail(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  email: string
) {
  const result = await pbList(request, env, token, "users", `email = "${email}"`);
  expect(result.items.length).toBeGreaterThan(0);
  return result.items[0].id as string;
}

async function findDemoPatient(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  document: string
) {
  const result = await pbList(request, env, token, "pacientes", `numero_documento = "${document}"`);
  return result.items[0] || null;
}

async function findDemoAppointment(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  motivo: string,
  slot = DEMO_SLOT,
  estado?: string
) {
  const statusFilter = estado ? ` && estado = "${estado}"` : "";
  const result = await pbList(
    request,
    env,
    token,
    "turnos",
    `medico_id = "${medicoId}" && fecha_hora = "${demoSlotIso(slot).replace("T", " ")}" && motivo = "${motivo}"${statusFilter}`
  );
  return result.items[0] || null;
}

async function findDemoAppointmentEvents(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  motivo: string,
  slot = DEMO_SLOT,
  tipo?: string
) {
  const appointment = await findDemoAppointment(request, env, token, medicoId, motivo, slot);
  if (!appointment) return [];

  const typeFilter = tipo ? ` && tipo = "${tipo}"` : "";
  const result = await pbList(
    request,
    env,
    token,
    "turno_eventos",
    `turno_id = "${appointment.id}"${typeFilter}`
  );
  return result.items;
}

async function createDemoAppointment(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  patientId: string,
  motivo: string,
  slot = DEMO_SLOT,
  estado = "En espera"
) {
  const availability = await pbList(
    request,
    env,
    token,
    "disponibilidades",
    `medico_id = "${medicoId}" && fecha_hora_inicio = "${demoSlotIso("09:00").replace("T", " ")}"`
  );
  const response = await request.post(`${pocketBaseUrl(env)}/api/collections/turnos/records`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      paciente_id: patientId,
      medico_id: medicoId,
      disponibilidad_id: availability.items[0]?.id,
      fecha_hora: demoSlotIso(slot),
      motivo,
      observaciones: "",
      estado,
      tipo: "Consulta",
      duracion: 15,
      es_sobreturno: false,
      sobreturno_tipo: "",
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function cleanupDemoAppointment(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  medicoId: string,
  motivo?: string,
  slot = DEMO_SLOT
) {
  const filter = motivo
    ? `medico_id = "${medicoId}" && fecha_hora = "${demoSlotIso(slot).replace("T", " ")}" && motivo = "${motivo}"`
    : `medico_id = "${medicoId}" && fecha_hora = "${demoSlotIso(slot).replace("T", " ")}" && motivo ~ "Playwright"`;
  const result = await pbList(request, env, token, "turnos", filter);

  for (const item of result.items) {
    const events = await pbList(request, env, token, "turno_eventos", `turno_id = "${item.id}"`);
    for (const event of events.items) {
      await request.delete(`${pocketBaseUrl(env)}/api/collections/turno_eventos/records/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    await request.delete(`${pocketBaseUrl(env)}/api/collections/turnos/records/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function cleanupDemoPatient(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  document: string
) {
  const result = await pbList(request, env, token, "pacientes", `numero_documento = "${document}"`);

  for (const item of result.items) {
    await request.delete(`${pocketBaseUrl(env)}/api/collections/pacientes/records/${item.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function pbList(
  request: APIRequestContext,
  env: Record<string, string>,
  token: string,
  collection: string,
  filter: string
) {
  const params = new URLSearchParams({ page: "1", perPage: "50", filter });
  const response = await request.get(`${pocketBaseUrl(env)}/api/collections/${collection}/records?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ items: Array<Record<string, string>> }>;
}

function demoSlotIso(slot = DEMO_SLOT) {
  return new Date(`${DEMO_DATE}T${slot}:00`).toISOString();
}

function pocketBaseUrl(env: Record<string, string>) {
  const url = (env.POCKETBASE_URL || env.NEXT_PUBLIC_POCKETBASE_URL || "").trim();
  if (!url) return "";

  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}

function loadTestEnv() {
  return loadEnv(process.env.PLAYWRIGHT_ENV_FILE || ".env.local");
}

function assertTestingPocketBase(env: Record<string, string>) {
  if (process.env.REQUIRE_TEST_POCKETBASE !== "true") return;
  if (process.env.ALLOW_PRODUCTION_PB_FOR_TESTS === "true") return;

  const url = pocketBaseUrl(env).toLowerCase();
  expect(url, "Configura una URL de PocketBase de testing antes de ejecutar Playwright").toBeTruthy();
  expect(
    TEST_PB_MARKERS.some((marker) => url.includes(marker)),
    `La URL de PocketBase no parece ser de testing: ${url}`
  ).toBeTruthy();
}

function loadEnv(path: string) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value) result[key] = value;
  }

  if (!fs.existsSync(path)) return result;

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}
