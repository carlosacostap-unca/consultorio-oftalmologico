export async function stopManagedServices(services, timeoutMs = 15_000) {
  const ordered = ["next", "pocketbase"];
  for (const name of ordered) {
    const child = services.get(name);
    if (child) await stopChildProcess(child, name, timeoutMs);
  }
}

export function stopChildProcess(child, name, timeoutMs = 15_000) {
  if (child.exitCode !== null || child.signalCode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeListener("exit", onExit);
      child.removeListener("error", onError);
      if (error) reject(error);
      else resolve();
    };
    const onExit = () => finish();
    const onError = () => finish(new Error(`El servicio ${name} falló durante el cierre.`));
    const timer = setTimeout(
      () => finish(new Error(`El servicio ${name} no cerró dentro del tiempo seguro.`)),
      timeoutMs,
    );
    child.once("exit", onExit);
    child.once("error", onError);
    if (!child.kill()) finish(new Error(`No se pudo solicitar el cierre del servicio ${name}.`));
  });
}

export function waitWithTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}
