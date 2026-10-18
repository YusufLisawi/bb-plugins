---
title: Higgsfield API request bodies and media workflows
description: Copyable bodies for upload, image editing, image-to-video, mixed references, and Soul ID.
---

# Common Higgsfield API workflows

These bodies were checked against the model pages and bundled schemas on 2026-09-25. Check the [API Console](https://console.higgsfield.ai) and the linked model page when using them: endpoint access and fields can change. All `https://example.com/...` URLs and the sample Soul reference ID are placeholders. Replace them with media URLs or IDs from your own API account before estimating or submitting. Use a public HTTPS URL, including the `public_url` returned by Higgsfield's upload API. A local path or `asset://` token is not a model input URL.

## Common request lifecycle

| Action | HTTP request | Body | CLI |
| --- | --- | --- | --- |
| Create an upload URL | `POST /files/generate-upload-url` | `{"content_type":"image/jpeg"}` (or matching supported MIME type) | `upload PATH` does this and the PUT below. |
| Upload media bytes | `PUT` to the returned `upload_url` | Raw bytes, with **all** returned `upload_headers`; omit API authorization | `upload PATH` |
| Estimate | `POST /estimate/{endpoint_id}` | The exact model input body | `estimate ENDPOINT_ID --input body.json` |
| Generate | `POST /{endpoint_id}` | The same model input body | `submit ENDPOINT_ID --input body.json` or `run ...` |
| Check generation | `GET` returned `status_url` | None | `status REQUEST_ID` or `wait REQUEST_ID` |
| Cancel queued request | `POST` returned `cancel_url` | None | `cancel REQUEST_ID` |
| Train a Soul ID | `POST /v1/custom-references` | [Soul ID body](../examples/soul-id-create.json) | `submit v1/custom-references --input body.json` |
| Check Soul ID training | `GET /v1/custom-references/{id}` | None | `reference-status ID` or `reference-wait ID` |

The API header for authenticated requests is `Authorization: Key KEY_ID:KEY_SECRET`; use the CLI to keep credentials out of shell history and process arguments. An accepted generation returns `request_id`, `status_url`, and `cancel_url`. A completed status normally carries `images[].url` for image workflows or `video.url` for video workflows. Save the URL or let `run --download-dir` save the output. The next model can consume a completed image's **remote** `images[0].url` as its input; the local downloaded copy requires another upload. See [API behavior](api-behavior.md) for terminal states, polling, and retry rules.

For any body below, copy its [example JSON](../examples/) to a working file, replace placeholders, then run:

```bash
python3 scripts/higgsfield.py schema ENDPOINT_ID
python3 scripts/higgsfield.py estimate ENDPOINT_ID --input body.json
python3 scripts/higgsfield.py run ENDPOINT_ID --input body.json --download-dir ./outputs
```

`run` estimates, submits exactly once, polls, and optionally downloads. Add `--max-usd VALUE` or `--max-credits VALUE` for a hard estimate ceiling. To manage submission separately, use `submit`, retain its `request_id`, then `wait` and `download`. Pass the ID rather than a returned `platform.higgsfield.ai` status URL to the CLI; it keeps credentials on `api.higgsfield.ai`. Never blindly repeat a generation POST after an uncertain timeout.

## Add reference images and edit an image

Upload each local image with `python3 scripts/higgsfield.py upload path/to/image.jpg`, copy each returned `public_url`, and place the URLs in order in `image_urls`. For Qwen Image 3 Edit, use 1–3 images. The edit instruction should identify the intended source and which reference supplies the style or object. This request preserves the prompt as written by disabling both enhancement options together:

**Endpoint:** `POST /alibaba/qwen-image-3/edit` · [model docs](https://docs.higgsfield.ai/docs/models/qwen-image-3/edit.md) · [JSON body](../examples/image-edit-qwen.json)

```json
{
  "prompt": "Edit image 1: keep the person and camera angle. Use image 2 only as a lighting reference; make the scene a warm sunset.",
  "image_urls": [
    "https://example.com/source.jpg",
    "https://example.com/lighting-reference.jpg"
  ],
  "resolution": "1k",
  "aspect_ratio": "3:2",
  "prompt_extend": false,
  "enable_thinking": false
}
```

If you want Qwen's enhancement, set `prompt_extend` and `enable_thinking` to `true`; `enable_thinking=true` requires `prompt_extend=true`. A prompt with only whitespace is invalid. For up to ten image references, Grok Imagine 2.0 accepts `image_urls` and a `prompt`; omit `image_urls` for its text-to-image mode. Its `quality` is `low` or `medium`, and `resolution` is `1k` or `2k`: [Grok JSON body](../examples/image-edit-grok.json) · [model docs](https://docs.higgsfield.ai/docs/models/grok-image-2/generate-and-edit.md).

After completion, save `images[0].url`. To animate that edited image, pass the URL as `image_url` in an image-to-video body below. If you need to edit the result again, pass it as an entry in a new `image_urls` array.

## Animate an image; optional first and last frames

Upload the still image first. Wan 2.6 uses one opening image and requires a motion prompt. Its `duration` is exactly 5, 10, or 15 seconds, and it does **not** accept a last frame:

**Endpoint:** `POST /wan/v2.6/image-to-video` · [model docs](https://docs.higgsfield.ai/docs/models/wan-2-6/image-to-video.md) · [JSON body](../examples/image-to-video-wan.json)

```json
{
  "prompt": "The camera slowly pushes in while the subject turns toward the window; natural motion and stable facial features.",
  "image_url": "https://example.com/first-frame.jpg",
  "duration": 5,
  "resolution": "720p"
}
```

For control over the final frame, Seedance 2.5 takes `image_url` plus optional `end_image_url`. The output follows the first image's framing; duration is an integer from 4 to 30 seconds. Its prompt is optional but useful for motion direction. `generate_audio` defaults to `true`. This endpoint requires public HTTPS media URLs and rejects `asset://` references:

**Endpoint:** `POST /bytedance/seedance-2.5/image-to-video` · [model docs](https://docs.higgsfield.ai/docs/models/seedance-2-5/image-to-video.md) · [JSON body](../examples/image-to-video-seedance-frames.json)

```json
{
  "image_url": "https://example.com/first-frame.jpg",
  "end_image_url": "https://example.com/last-frame.jpg",
  "prompt": "One continuous camera move from the opening composition to the closing composition.",
  "duration": 8,
  "resolution": "720p",
  "generate_audio": true
}
```

Kling 3.0 also supports a last frame, but its field is named `last_image_url` and its documented runtime expects a nonempty top-level `prompt`: [Kling image-to-video model page](https://docs.higgsfield.ai/docs/models/kling-3/standard-image-to-video.md). Do not copy Seedance's `end_image_url` field into a Kling request.

## Use multiple images, clips, or audio as video references

Seedance 2.5 `reference-to-video` accepts at least one nonempty array among `image_urls`, `video_urls`, and `audio_urls`; you can combine them. Limits: 30 images, 10 videos, 10 audio files, and 50 media items overall. The provider normalizes the reference video duration to at most 30 seconds total and the reference audio duration to at most 30 seconds total. Use public HTTPS media URLs, never `asset://` references. Unlike `image-to-video`, these inputs are references rather than a promised first or last frame.

**Endpoint:** `POST /bytedance/seedance-2.5/reference-to-video` · [model docs](https://docs.higgsfield.ai/docs/models/seedance-2-5/reference-to-video.md) · [JSON body](../examples/reference-to-video-seedance.json)

```json
{
  "prompt": "Use the first image for the character, the second for the location, the clip for pacing, and the audio for atmosphere. Show the character entering the room.",
  "image_urls": [
    "https://example.com/character.jpg",
    "https://example.com/location.jpg"
  ],
  "video_urls": ["https://example.com/motion-reference.mp4"],
  "audio_urls": ["https://example.com/ambience.wav"],
  "duration": 8,
  "resolution": "720p",
  "aspect_ratio": "16:9",
  "generate_audio": true
}
```

For video-only references, Wan 2.6 `reference-to-video` needs a `prompt` and 1–3 `video_urls`; its duration supports 5 or 10 seconds: [Wan JSON body](../examples/reference-to-video-wan.json) · [model docs](https://docs.higgsfield.ai/docs/models/wan-2-6/reference-to-video.md). Do not assume an image reference field exists on that endpoint.

## Build a reusable character reference with Soul ID

This is a training lifecycle, separate from a generation request. Upload 1–100 character images, then use their URLs in `input_images` objects. Set `model_version` to the family you intend to generate with; the default is `v1`. A completed reference ID belongs to the API account that trained it.

**Endpoint:** `POST /v1/custom-references` · [Soul ID docs](https://docs.higgsfield.ai/docs/models/soul-id/create-character.md) · [JSON body](../examples/soul-id-create.json)

```json
{
  "name": "My character",
  "model_version": "v2",
  "input_images": [
    {"type": "image_url", "image_url": "https://example.com/character-front.jpg"},
    {"type": "image_url", "image_url": "https://example.com/character-profile.jpg"}
  ]
}
```

Run `python3 scripts/higgsfield.py submit v1/custom-references --input soul-id.json`, keep the returned `id`, and run `python3 scripts/higgsfield.py reference-wait ID`. Training can be `not_ready`, `queued`, `in_progress`, `completed`, or `failed`; only use an ID after `completed`. The generic generation `run` command does not poll this training endpoint.

Then generate with the matching Soul V2 model, setting `custom_reference_id` to that completed ID and `custom_reference_strength` greater than zero and at most one. The schema accepts zero but the runtime currently fails for a character reference.

**Endpoint:** `POST /higgsfield-ai/soul/v2/standard` · [Soul V2 docs](https://docs.higgsfield.ai/docs/models/soul-2/generate.md) · [JSON body](../examples/soul-v2-character.json)

```json
{
  "prompt": "The same character standing in a sunlit studio, full body portrait.",
  "custom_reference_id": "11111111-1111-4111-8111-111111111111",
  "custom_reference_strength": 0.8,
  "aspect_ratio": "2:3",
  "resolution": "720p",
  "batch_size": 1
}
```

## Chaining a practical edit into video

1. Upload the source and any style/reference images. Keep each returned `public_url`.
2. Fill [Qwen edit](../examples/image-edit-qwen.json), estimate, run, and capture the completed `images[0].url`.
3. Put that completed image URL in the `image_url` of [Wan image-to-video](../examples/image-to-video-wan.json), or [Seedance first/last frame](../examples/image-to-video-seedance-frames.json) when a final frame is needed.
4. Estimate the video body separately. Run it, then save the completed `video.url` or use `--download-dir`.

Each step is a separate request and cost. The `run` output includes `estimate`, `accepted`, `result`, and `downloaded`, so store it if you need an auditable chain: `python3 scripts/higgsfield.py run ENDPOINT_ID --input body.json --download-dir ./outputs > result.json`. A failed or still-running result should not be used as the next input.
