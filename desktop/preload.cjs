// CommonJS is required for Electron preload scripts when sandboxing is enabled.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require("electron");

const runtime = Object.freeze(ipcRenderer.sendSync("desktop:runtime"));

contextBridge.exposeInMainWorld("consultorioDesktop", Object.freeze({
  runtime,
  secrets: Object.freeze({
    get: (key) => ipcRenderer.invoke("desktop:secret:get", key),
    set: (key, value) => ipcRenderer.invoke("desktop:secret:set", key, value),
    delete: (key) => ipcRenderer.invoke("desktop:secret:delete", key),
  }),
  diagnostics: Object.freeze({
    openFolder: () => ipcRenderer.invoke("desktop:diagnostics:open"),
    export: () => ipcRenderer.invoke("desktop:diagnostics:export"),
  }),
  local: Object.freeze({
    userExists: (input) => ipcRenderer.invoke("desktop:local:user-exists", input),
    upsertSystemSetting: (input) => ipcRenderer.invoke("desktop:local:upsert-system-setting", input),
  }),
  central: Object.freeze({
    authenticate: (input) => ipcRenderer.invoke("desktop:central:authenticate", input),
    request: (input) => ipcRenderer.invoke("desktop:central:request", input),
  }),
  updates: Object.freeze({
    getState: () => ipcRenderer.invoke("desktop:update:state"),
    check: () => ipcRenderer.invoke("desktop:update:check"),
    postpone: () => ipcRenderer.invoke("desktop:update:postpone"),
    install: () => ipcRenderer.invoke("desktop:update:install"),
    onState: (callback) => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on("desktop:update:state-changed", listener);
      return () => ipcRenderer.removeListener("desktop:update:state-changed", listener);
    },
  }),
  maintenance: Object.freeze({
    ready: (requestId, status) => ipcRenderer.invoke("desktop:maintenance:ready", requestId, status),
    onPrepare: (callback) => {
      const listener = (_event, requestId) => callback(requestId);
      ipcRenderer.on("desktop:maintenance:prepare", listener);
      return () => ipcRenderer.removeListener("desktop:maintenance:prepare", listener);
    },
    onRelease: (callback) => {
      const listener = () => callback();
      ipcRenderer.on("desktop:maintenance:release", listener);
      return () => ipcRenderer.removeListener("desktop:maintenance:release", listener);
    },
  }),
}));
