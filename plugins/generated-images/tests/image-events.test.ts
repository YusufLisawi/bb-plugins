import assert from "node:assert/strict";
import test from "node:test";
import {
  extractGeneratedImage,
  extractGeneratedImages,
} from "../image-events.ts";

const successfulEvent = {
  type: "provider/unhandled",
  threadId: "thr_test",
  seq: 42,
  createdAt: 123,
  data: {
    rawEvent: {
      params: {
        item: {
          type: "imageGeneration",
          id: "exec_test",
          status: "completed",
          failure: null,
          revisedPrompt: "A cat in a hat",
          savedPath: "/tmp/cat.png",
        },
      },
    },
  },
};

test("extracts a completed image-generation event", () => {
  assert.deepEqual(extractGeneratedImage(successfulEvent), {
    threadId: "thr_test",
    itemId: "exec_test",
    seq: 42,
    savedPath: "/tmp/cat.png",
    revisedPrompt: "A cat in a hat",
    mimeType: "image/png",
    createdAt: 123,
  });
});

test("accepts the provider schema's optional failure field when omitted", () => {
  const withoutFailure = structuredClone(successfulEvent);
  delete withoutFailure.data.rawEvent.params.item.failure;
  assert.equal(extractGeneratedImage(withoutFailure)?.itemId, "exec_test");
});

test("ignores unfinished, failed, and non-image events", () => {
  assert.equal(
    extractGeneratedImage({
      ...successfulEvent,
      type: "item/completed",
    }),
    null,
  );
  assert.equal(
    extractGeneratedImage({
      ...successfulEvent,
      data: {
        rawEvent: {
          params: {
            item: {
              ...successfulEvent.data.rawEvent.params.item,
              status: "in_progress",
            },
          },
        },
      },
    }),
    null,
  );
  assert.equal(
    extractGeneratedImage({
      ...successfulEvent,
      data: {
        rawEvent: {
          params: {
            item: {
              ...successfulEvent.data.rawEvent.params.item,
              failure: "provider error",
            },
          },
        },
      },
    }),
    null,
  );
});

test("deduplicates events by thread and item id", () => {
  assert.equal(extractGeneratedImages([successfulEvent, successfulEvent]).length, 1);
});
