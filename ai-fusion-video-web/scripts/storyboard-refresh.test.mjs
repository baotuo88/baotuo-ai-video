import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/storyboard-refresh.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { createStoryboardRefreshCoordinator } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);

function fixture(refresh) {
  const pending = new Set();
  const coordinator = createStoryboardRefreshCoordinator(refresh, (callback) => {
    pending.add(callback);
    return () => pending.delete(callback);
  });
  const flush = async () => {
    const batch = [...pending];
    pending.clear();
    batch.forEach((callback) => callback());
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { coordinator, flush };
}

test("assistant invalidation refreshes an idle page without a task-state transition", async () => {
  let calls = 0;
  const { coordinator, flush } = fixture(async () => { calls++; });
  coordinator.update(true, false);
  await flush();
  assert.equal(calls, 1);
});

test("many updates wait for the current project task and produce one refresh", async () => {
  let calls = 0;
  const { coordinator, flush } = fixture(async () => { calls++; });
  coordinator.update(true, true);
  coordinator.update(true, true);
  await flush();
  assert.equal(calls, 0);
  coordinator.update(false, false);
  await flush();
  assert.equal(calls, 1);
});

test("new invalidation during a request is refreshed after that request settles", async () => {
  let calls = 0;
  let finish;
  const { coordinator, flush } = fixture(() => {
    calls++;
    return new Promise((resolve) => { finish = resolve; });
  });
  coordinator.update(true, false);
  await flush();
  coordinator.update(true, false);
  await flush();
  assert.equal(calls, 1);
  finish();
  await new Promise((resolve) => setImmediate(resolve));
  await flush();
  assert.equal(calls, 2);
  finish();
  coordinator.dispose();
});

test("route disposal cancels pending refreshes", async () => {
  let calls = 0;
  const { coordinator, flush } = fixture(async () => { calls++; });
  coordinator.update(true, false);
  coordinator.dispose();
  await flush();
  assert.equal(calls, 0);
});

const dataSource = await readFile(new URL(
  "../app/(dashboard)/projects/[id]/storyboards/storyboard-data.ts", import.meta.url,
), "utf8");
const dataModule = ts.transpileModule(dataSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { reconcileStoryboardGroups } = await import(
  "data:text/javascript;base64," + Buffer.from(dataModule).toString("base64")
);

test("unchanged responses keep all scene and item references", () => {
  const current = [{ scene: { id: 1 }, items: [{ id: 2, firstFrameImageUrl: "old.png" }] }];
  assert.equal(reconcileStoryboardGroups(current, structuredClone(current)), current);
});

test("frame completion changes only the affected item", () => {
  const current = [
    { scene: { id: 1 }, items: [{ id: 2, firstFrameImageUrl: "old.png" }, { id: 3 }] },
    { scene: { id: 4 }, items: [{ id: 5 }] },
  ];
  const response = structuredClone(current);
  response[0].items[0].firstFrameImageUrl = "new.png";
  const updated = reconcileStoryboardGroups(current, response);
  assert.equal(updated[0].items[0].firstFrameImageUrl, "new.png");
  assert.equal(updated[0].items[1], current[0].items[1]);
  assert.equal(updated[1], current[1]);
  assert.equal(current[0].items[0].firstFrameImageUrl, "old.png");
});

test("refresh honors scene deletion and item ordering", () => {
  const current = [
    { scene: { id: 1 }, items: [{ id: 2 }, { id: 3 }] },
    { scene: { id: 4 }, items: [{ id: 5 }] },
  ];
  const updated = reconcileStoryboardGroups(current, [
    { scene: { id: 1 }, items: [{ id: 3 }, { id: 2 }] },
  ]);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].items[0], current[0].items[1]);
});
