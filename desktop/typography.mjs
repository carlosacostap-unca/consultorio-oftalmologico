import { readFileSync, renameSync, writeFileSync } from "node:fs";

function validPercent(value) {
  return Number.isInteger(value) && value >= 80 && value <= 200 && value % 10 === 0;
}

export function typographyShortcut(input) {
  if (!input.control || input.alt || input.meta || input.isComposing) return null;
  if (input.key === "+" || input.key === "=" || input.code === "NumpadAdd") return "increase";
  if (input.key === "-" || input.code === "NumpadSubtract") return "decrease";
  if (input.key === "0" || input.code === "Numpad0") return "reset";
  return null;
}

export function installDesktopTypography(contents, preferencesPath, { platform = process.platform, onError = () => {} } = {}) {
  if (platform !== "win32") return;
  let percent = 100;
  try {
    const saved = JSON.parse(readFileSync(preferencesPath, "utf8"));
    if (validPercent(saved?.percent)) percent = saved.percent;
  } catch (error) {
    if (error.code !== "ENOENT") onError(error);
  }

  // Scoped to this window; the renderer can read but cannot write files or choose paths.
  contents.ipc.on("desktop:typography:get", (event) => {
    event.returnValue = percent / 100;
  });
  contents.on("before-input-event", (event, input) => {
    const action = typographyShortcut(input);
    if (!action) return;
    // Prevent both native page zoom and Electron's menu accelerators, even at the limits.
    event.preventDefault();
    if (input.type !== "keyDown") return;
    const next = action === "reset" ? 100 : Math.max(80, Math.min(200, percent + (action === "increase" ? 10 : -10)));
    if (next === percent) return;
    percent = next;
    contents.send("desktop:typography:changed", percent / 100);
    try {
      // Tiny atomic write completes before a user can close the app after the shortcut.
      writeFileSync(`${preferencesPath}.tmp`, `${JSON.stringify({ percent })}\n`, "utf8");
      renameSync(`${preferencesPath}.tmp`, preferencesPath);
    } catch (error) {
      onError(error);
    }
  });
}
