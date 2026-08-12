export function resolveElectronAutoUpdater(moduleNamespace) {
  const autoUpdater = moduleNamespace?.autoUpdater
    ?? moduleNamespace?.default?.autoUpdater;

  if (!autoUpdater || typeof autoUpdater.on !== "function" || typeof autoUpdater.checkForUpdates !== "function") {
    throw new Error("electron-updater no expuso una instancia compatible de autoUpdater.");
  }

  return autoUpdater;
}

export async function initializeDesktopUpdaterWithoutBlocking(initialize, onFailure) {
  try {
    await initialize();
    return true;
  } catch (error) {
    await onFailure(error);
    return false;
  }
}
