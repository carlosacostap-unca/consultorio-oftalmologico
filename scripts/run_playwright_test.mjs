import { spawnSync } from "node:child_process";
import { applyEnv, assertTestingPocketBaseUrl, envFileFromArgs, loadEnvFile, pocketBaseUrl } from "./env_utils.mjs";

const envFile = envFileFromArgs(".env.test.local");
const env = loadEnvFile(envFile, { required: true });
applyEnv(env);

process.env.PLAYWRIGHT_ENV_FILE = envFile;
process.env.REQUIRE_TEST_POCKETBASE = "true";

assertTestingPocketBaseUrl(pocketBaseUrl(process.env), { requireTest: true });

const passthroughArgs = process.argv
  .slice(2)
  .filter((arg, index, args) => arg !== "--env" && args[index - 1] !== "--env" && !arg.startsWith("--env="));

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["playwright", "test", ...passthroughArgs], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(`No se pudo ejecutar Playwright: ${result.error.message}`);
}

if (result.signal) {
  console.error(`Playwright termino por senal: ${result.signal}`);
}

process.exit(result.status ?? 1);
