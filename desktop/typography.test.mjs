import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { installDesktopTypography } from "./typography.mjs";

function windowHarness(file, options) {
  const contents = new EventEmitter();
  contents.ipc = new EventEmitter();
  const changes = [];
  contents.send = (_channel, scale) => changes.push(scale);
  installDesktopTypography(contents, file, { platform: "win32", ...options });
  return {
    changes,
    scale() {
      const event = {};
      contents.ipc.emit("desktop:typography:get", event);
      return event.returnValue;
    },
    key(input) {
      let prevented = false;
      contents.emit("before-input-event", { preventDefault: () => { prevented = true; } }, {
        control: true, type: "keyDown", key: "+", ...input,
      });
      return prevented;
    },
  };
}

test("shortcuts preserve text input, honor modifiers, clamp and reset", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "desktop-fonts-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const win = windowHarness(path.join(dir, "typography.json"));
  for (const input of [{ control: false }, { alt: true }, { meta: true }, { isComposing: true }, { key: "a" }]) {
    assert.equal(win.key(input), false);
    assert.equal(win.scale(), 1);
  }
  assert.equal(win.key({ type: "keyUp" }), true);
  assert.equal(win.scale(), 1);
  for (const input of [{ key: "+", shift: true }, { key: "=" }, { key: "Add", code: "NumpadAdd" }]) {
    assert.equal(win.key(input), true);
  }
  assert.equal(win.scale(), 1.3);
  win.key({ key: "Subtract", code: "NumpadSubtract" });
  assert.equal(win.scale(), 1.2);
  for (let i = 0; i < 30; i++) assert.equal(win.key({}), true);
  assert.equal(win.scale(), 2);
  for (let i = 0; i < 30; i++) win.key({ key: "-" });
  assert.equal(win.scale(), 0.8);
  win.key({ key: "0" });
  assert.equal(win.scale(), 1);
});

test("preference survives window recreation and rejects corrupt or out-of-range values", (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "desktop-fonts-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "typography.json");
  const first = windowHarness(file);
  first.key({});
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), { percent: 110 });
  assert.equal(windowHarness(file).scale(), 1.1);
  for (const value of ["broken", "null", '{"percent":999}', '{"percent":85}', '{"percent":"110"}']) {
    writeFileSync(file, value);
    assert.equal(windowHarness(file).scale(), 1);
  }
});

test("failed persistence retains session preference; other platforms do not intercept shortcuts", () => {
  const errors = [];
  const win = windowHarness(path.join(os.tmpdir(), "missing-parent", "missing-child", "typography.json"), { onError: error => errors.push(error) });
  win.key({});
  assert.equal(win.scale(), 1.1);
  assert.equal(errors.length, 1);
  assert.equal(windowHarness("unused", { platform: "linux" }).key({}), false);
});
