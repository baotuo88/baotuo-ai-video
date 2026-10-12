import assert from "node:assert/strict";
import test from "node:test";
import { attachmentDraftScope, createAssistantAttachmentStore } from "./assistant-attachment-store";
import type { AssistantAttachment } from "@/components/dashboard/assistant/assistant-multimodal";

const attachment: AssistantAttachment = {
  id: "image-1", name: "reference.png", inputType: "image", mimeType: "image/png",
  transport: "url", url: "/media/reference.png", size: 100,
};

function fixture() {
  const store = createAssistantAttachmentStore();
  store.getState().resetForUser(1);
  return store;
}

test("prepared attachments survive all input component subscribers leaving", async () => {
  const store = fixture();
  const unsubscribe = store.subscribe(() => {});
  await store.getState().prepare(1, "new", async () => [attachment]);
  unsubscribe();
  assert.deepEqual(store.getState().drafts.new.attachments, [attachment]);
});

test("an upload finishes in its original conversation after switching views", async () => {
  const store = fixture();
  let finish!: (files: AssistantAttachment[]) => void;
  const pending = store.getState().prepare(1, "conversation:a", () => new Promise((resolve) => { finish = resolve; }));
  await store.getState().prepare(1, "conversation:b", async () => [{ ...attachment, id: "image-2" }]);
  finish([attachment]);
  await pending;
  assert.equal(store.getState().drafts["conversation:a"].attachments[0].id, "image-1");
  assert.equal(store.getState().drafts["conversation:b"].attachments[0].id, "image-2");
});

test("clearing a draft prevents an old upload from restoring its attachments", async () => {
  const store = fixture();
  let finish!: (files: AssistantAttachment[]) => void;
  const pending = store.getState().prepare(1, "new", () => new Promise((resolve) => { finish = resolve; }));
  store.getState().clear(1, "new");
  await store.getState().prepare(1, "new", async () => [{ ...attachment, id: "replacement" }]);
  finish([attachment]);
  await pending;
  assert.deepEqual(store.getState().drafts.new.attachments.map((item) => item.id), ["replacement"]);
});

test("logout and same-user login invalidate unfinished uploads", async () => {
  const store = fixture();
  let finish!: (files: AssistantAttachment[]) => void;
  const pending = store.getState().prepare(1, "new", () => new Promise((resolve) => { finish = resolve; }));
  store.getState().resetForUser(null);
  store.getState().resetForUser(1);
  finish([attachment]);
  await pending;
  assert.deepEqual(store.getState().drafts, {});
});

test("a different user cannot read or modify the previous user draft", async () => {
  const store = fixture();
  await store.getState().prepare(1, "new", async () => [attachment]);
  store.getState().resetForUser(2);
  await assert.rejects(store.getState().prepare(1, "new", async () => [attachment]), /登录状态/);
  assert.deepEqual(store.getState().drafts, {});
});

test("upload errors remain visible after remount and successful retry clears them", async () => {
  const store = fixture();
  await assert.rejects(store.getState().prepare(1, "new", async () => { throw new Error("上传失败"); }));
  assert.equal(store.getState().drafts.new.error, "上传失败");
  assert.equal(store.getState().drafts.new.uploading, false);
  await store.getState().prepare(1, "new", async () => [attachment]);
  assert.equal(store.getState().drafts.new.error, null);
});

test("duplicate upload submissions are rejected while the first is pending", async () => {
  const store = fixture();
  let finish!: (files: AssistantAttachment[]) => void;
  const pending = store.getState().prepare(1, "new", () => new Promise((resolve) => { finish = resolve; }));
  await assert.rejects(store.getState().prepare(1, "new", async () => []), /正在处理中/);
  finish([attachment]);
  await pending;
});

test("new conversation scopes cannot collide with a real conversation id", () => {
  assert.notEqual(attachmentDraftScope(null), attachmentDraftScope("new"));
});
